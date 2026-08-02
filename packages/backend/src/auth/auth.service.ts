import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { and, eq, isNull, lt } from "drizzle-orm";

import type { Env } from "../config/env";
import { DATABASE, type Database } from "../database/database.types";
import {
  refreshTokens,
  schoolMemberships,
  sessions,
  users,
} from "../database/schema";

import type { AccessTokenPayload } from "./access-token-payload";
import { PasswordService } from "./password.service";
import { permissionsForRole } from "./permissions";
import { TokenService } from "./token.service";

/** Request metadata recorded on the session. Both may legitimately be absent. */
export interface RequestContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    schoolId: string;
    role: string;
  };
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Verifies credentials and opens a session bound to ONE school membership.
   *
   * Every failure path returns the same message and takes a similar amount of
   * work, so an attacker cannot distinguish "no such user" from "wrong
   * password" from "no membership".
   */
  async login(
    email: string,
    password: string,
    context: RequestContext,
    schoolId?: string,
  ): Promise<AuthResult> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    /*
     * Hash a dummy password when the user does not exist. Without this, a
     * missing account returns measurably faster than a wrong password, and
     * the timing difference enumerates valid emails.
     */
    if (!user) {
      await this.passwords.hash(password);
      throw new UnauthorizedException("Invalid email or password.");
    }

    const valid = await this.passwords.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const membership = await this.resolveMembership(user.id, schoolId);
    if (!membership) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return this.openSession(user, membership, context);
  }

  /**
   * Rotates a refresh token.
   *
   * The security-critical path. Presenting an ALREADY-USED token means the
   * token was stolen — either the attacker is replaying it or the legitimate
   * client is, after the attacker rotated first. Either way the session
   * family is compromised, so the entire session is revoked rather than
   * merely rejecting this request.
   */
  async refresh(
    presentedToken: string,
    context: RequestContext,
  ): Promise<AuthResult> {
    const hash = this.tokens.hashRefreshToken(presentedToken);

    const [stored] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .limit(1);

    if (!stored) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (stored.usedAt !== null) {
      /* Reuse detected. Burn the whole family. */
      await this.revokeSession(stored.sessionId, "refresh_token_reuse");

      this.logger.warn(
        `Refresh token reuse detected for session ${stored.sessionId}. Session revoked.`,
      );

      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, stored.sessionId), isNull(sessions.revokedAt)))
      .limit(1);

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
      .limit(1);

    const [membership] = await this.db
      .select()
      .from(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.id, session.membershipId),
          isNull(schoolMemberships.deletedAt),
        ),
      )
      .limit(1);

    if (!user || user.status !== "ACTIVE" || !membership) {
      /* Access was revoked since the session opened. */
      await this.revokeSession(session.id, "principal_no_longer_valid");
      throw new UnauthorizedException("Invalid refresh token.");
    }

    return this.db.transaction(async (tx) => {
      /*
       * Mark used rather than delete. A deleted row is indistinguishable from
       * one that never existed, which would make reuse undetectable.
       *
       * The isNull guard makes rotation atomic: two concurrent refreshes race
       * here, and exactly one updates a row.
       */
      const rotated = await tx
        .update(refreshTokens)
        .set({ usedAt: new Date() })
        .where(
          and(eq(refreshTokens.id, stored.id), isNull(refreshTokens.usedAt)),
        )
        .returning();

      if (rotated.length === 0) {
        throw new UnauthorizedException("Invalid refresh token.");
      }

      const issued = await this.issueRefreshToken(tx, session.id);

      await tx
        .update(sessions)
        .set({
          lastActivityAt: new Date(),
          ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
        })
        .where(eq(sessions.id, session.id));

      return {
        accessToken: await this.signAccessToken({
          sub: user.id,
          email: user.email,
          schoolId: session.schoolId,
          membershipId: membership.id,
          roles: [membership.role],
          permissions: permissionsForRole(membership.role),
          sessionId: session.id,
        }),
        refreshToken: issued.token,
        expiresAt: issued.expiresAt,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          schoolId: session.schoolId,
          role: membership.role,
        },
      };
    });
  }

  /** Revokes the session behind a refresh token. Idempotent. */
  async logout(presentedToken: string): Promise<void> {
    const hash = this.tokens.hashRefreshToken(presentedToken);

    const [stored] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .limit(1);

    if (stored) {
      await this.revokeSession(stored.sessionId, "logout");
    }
  }

  async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));

    /* Invalidate outstanding refresh tokens for the family. */
    await this.db
      .update(refreshTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.sessionId, sessionId),
          isNull(refreshTokens.usedAt),
        ),
      );
  }

  private async resolveMembership(userId: string, schoolId?: string) {
    const conditions = [
      eq(schoolMemberships.userId, userId),
      isNull(schoolMemberships.deletedAt),
    ];

    if (schoolId) {
      conditions.push(eq(schoolMemberships.schoolId, schoolId));
    }

    const [membership] = await this.db
      .select()
      .from(schoolMemberships)
      .where(and(...conditions))
      .limit(1);

    return membership;
  }

  private async openSession(
    user: typeof users.$inferSelect,
    membership: typeof schoolMemberships.$inferSelect,
    context: RequestContext,
  ): Promise<AuthResult> {
    return this.db.transaction(async (tx) => {
      const [session] = await tx
        .insert(sessions)
        .values({
          userId: user.id,
          membershipId: membership.id,
          schoolId: membership.schoolId,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
          ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
          ...(context.userAgent
            ? { userAgent: context.userAgent.slice(0, 512) }
            : {}),
        })
        .returning();

      if (!session) {
        throw new Error("Failed to create session.");
      }

      const issued = await this.issueRefreshToken(tx, session.id);

      return {
        accessToken: await this.signAccessToken({
          sub: user.id,
          email: user.email,
          schoolId: membership.schoolId,
          membershipId: membership.id,
          roles: [membership.role],
          permissions: permissionsForRole(membership.role),
          sessionId: session.id,
        }),
        refreshToken: issued.token,
        expiresAt: issued.expiresAt,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          schoolId: membership.schoolId,
          role: membership.role,
        },
      };
    });
  }

  private async issueRefreshToken(
    tx: Database,
    sessionId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const { token, hash } = this.tokens.createRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await tx
      .insert(refreshTokens)
      .values({ sessionId, tokenHash: hash, expiresAt });

    return { token, expiresAt };
  }

  private async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
      expiresIn: this.config.get("JWT_ACCESS_TTL", { infer: true }),
    });
  }

  /** Cleanup for expired refresh tokens. Wired to a scheduler later. */
  async purgeExpired(): Promise<number> {
    const result = await this.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()))
      .returning();

    return result.length;
  }
}
