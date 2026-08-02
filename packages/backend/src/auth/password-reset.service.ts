import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import { DATABASE, type Database } from "../database/database.types";
import { passwordResetTokens, sessions, users } from "../database/schema";

import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/** One hour. A reset link lives in an inbox; it should not live long. */
const RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  /**
   * Begins a reset.
   *
   * Returns void in ALL cases — including an unregistered address. Reporting
   * "no such account" turns this endpoint into a user-enumeration oracle,
   * which is precisely what an attacker probes before a credential-stuffing
   * run.
   *
   * The caller sends the same "if that address exists, check your email"
   * response either way.
   */
  async request(email: string): Promise<{ token: string } | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    if (!user || user.status === "SUSPENDED") {
      this.logger.log(
        "Password reset requested for an address with no eligible account.",
      );
      return null;
    }

    /* Invalidate outstanding tokens, so only the newest link works. */
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    const { token, hash } = this.tokens.createRefreshToken();

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });

    /*
     * Returned to the CALLER, not to the HTTP client — the controller hands
     * it to the mail service. Until that exists, it is logged in
     * development only and never included in a response body.
     */
    return { token };
  }

  /**
   * Completes a reset.
   *
   * On success, every session for the user is revoked. If the reset was
   * triggered because an account was compromised, leaving the attacker's
   * existing session alive would defeat the entire exercise.
   */
  async confirm(presentedToken: string, newPassword: string): Promise<void> {
    const hash = this.tokens.hashRefreshToken(presentedToken);

    const [stored] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hash))
      .limit(1);

    /* One message for unknown, used, and expired — no probing. */
    const invalid = new BadRequestException(
      "This reset link is invalid or has expired.",
    );

    if (!stored || stored.usedAt !== null) {
      throw invalid;
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw invalid;
    }

    const passwordHash = await this.passwords.hash(newPassword);

    await this.db.transaction(async (tx) => {
      /* Single-use, enforced atomically against a concurrent second use. */
      const consumed = await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.id, stored.id),
            isNull(passwordResetTokens.usedAt),
          ),
        )
        .returning();

      if (consumed.length === 0) {
        throw invalid;
      }

      await tx
        .update(users)
        .set({ passwordHash, status: "ACTIVE", updatedAt: new Date() })
        .where(eq(users.id, stored.userId));

      /* Log out everywhere. */
      await tx
        .update(sessions)
        .set({ revokedAt: new Date(), revokedReason: "password_reset" })
        .where(
          and(eq(sessions.userId, stored.userId), isNull(sessions.revokedAt)),
        );
    });

    this.logger.log(`Password reset completed for user ${stored.userId}.`);
  }
}
