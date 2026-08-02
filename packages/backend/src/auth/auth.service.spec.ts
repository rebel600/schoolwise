import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  refreshTokens,
  schoolMemberships,
  schools,
  sessions,
  users,
} from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../testing/test-database";

import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

const SECRET = "test_only_secret_at_least_32_characters_long";

describe("AuthService", () => {
  let harness: TestDatabase;
  let auth: AuthService;
  let passwords: PasswordService;
  let schoolA: string;
  let schoolB: string;

  const config = {
    get: (key: string) =>
      key === "JWT_ACCESS_SECRET"
        ? SECRET
        : key === "JWT_ACCESS_TTL"
          ? "15m"
          : "",
  } as unknown as ConfigService;

  beforeAll(async () => {
    harness = await createTestDatabase();
    passwords = new PasswordService();

    auth = new AuthService(
      harness.db,
      passwords,
      new TokenService(),
      new JwtService(),
      config as never,
    );

    const [a] = await harness.db
      .insert(schools)
      .values({ slug: "school-a", name: "School A" })
      .returning();
    const [b] = await harness.db
      .insert(schools)
      .values({ slug: "school-b", name: "School B" })
      .returning();

    schoolA = a!.id;
    schoolB = b!.id;
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.db.delete(refreshTokens);
    await harness.db.delete(sessions);
    await harness.db.delete(schoolMemberships);
    await harness.db.delete(users);
  });

  async function seedUser(
    email: string,
    password: string,
    schoolId: string,
    role: "ADMIN" | "TEACHER" | "STUDENT" = "TEACHER",
    status: "ACTIVE" | "SUSPENDED" = "ACTIVE",
  ) {
    const [user] = await harness.db
      .insert(users)
      .values({
        email,
        passwordHash: await passwords.hash(password),
        firstName: "Test",
        lastName: "User",
        status,
      })
      .returning();

    const [membership] = await harness.db
      .insert(schoolMemberships)
      .values({ schoolId, userId: user!.id, role })
      .returning();

    return { user: user!, membership: membership! };
  }

  describe("login", () => {
    it("issues tokens and binds the session to the user's school", async () => {
      await seedUser("teacher@example.com", "correct horse battery", schoolA);

      const result = await auth.login(
        "teacher@example.com",
        "correct horse battery",
        {},
      );

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.schoolId).toBe(schoolA);
      expect(result.user.role).toBe("TEACHER");
    });

    it("rejects a wrong password", async () => {
      await seedUser("teacher@example.com", "correct horse battery", schoolA);

      await expect(
        auth.login("teacher@example.com", "wrong password", {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("gives an unknown email the same message as a wrong password", async () => {
      await seedUser("teacher@example.com", "correct horse battery", schoolA);

      const unknown = await auth
        .login("nobody@example.com", "whatever", {})
        .catch((e: Error) => e.message);
      const wrong = await auth
        .login("teacher@example.com", "whatever", {})
        .catch((e: Error) => e.message);

      /* Distinguishable messages would enumerate valid accounts. */
      expect(unknown).toBe(wrong);
    });

    it("refuses a suspended account", async () => {
      await seedUser("susp@example.com", "pw", schoolA, "TEACHER", "SUSPENDED");

      await expect(auth.login("susp@example.com", "pw", {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("refuses a user with no membership in the requested school", async () => {
      await seedUser("teacher@example.com", "pw", schoolA);

      await expect(
        auth.login("teacher@example.com", "pw", {}, schoolB),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("stores the refresh token hashed, never in plaintext", async () => {
      await seedUser("teacher@example.com", "pw", schoolA);
      const result = await auth.login("teacher@example.com", "pw", {});

      const rows = await harness.db.select().from(refreshTokens);

      expect(rows).toHaveLength(1);
      expect(rows[0]!.tokenHash).not.toBe(result.refreshToken);
      expect(rows[0]!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("refresh", () => {
    it("rotates the token, invalidating the presented one", async () => {
      await seedUser("teacher@example.com", "pw", schoolA);
      const first = await auth.login("teacher@example.com", "pw", {});

      const second = await auth.refresh(first.refreshToken, {});

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(second.accessToken).toBeTruthy();
    });

    it("rejects an unknown token", async () => {
      await expect(auth.refresh("not-a-real-token", {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    /**
     * The attack this design exists to defeat.
     *
     * A stolen refresh token is indistinguishable from the real one until
     * BOTH are used. The second use is the signal, and the response is to
     * revoke the entire family rather than just reject the request —
     * otherwise the thief simply keeps the token they successfully rotated.
     */
    it("revokes the whole session when a used token is presented again", async () => {
      await seedUser("teacher@example.com", "pw", schoolA);
      const first = await auth.login("teacher@example.com", "pw", {});

      const second = await auth.refresh(first.refreshToken, {});

      /* The attacker replays the already-rotated token. */
      await expect(auth.refresh(first.refreshToken, {})).rejects.toThrow(
        UnauthorizedException,
      );

      /* The legitimate client's newer token is now dead too. */
      await expect(auth.refresh(second.refreshToken, {})).rejects.toThrow(
        UnauthorizedException,
      );

      const [session] = await harness.db.select().from(sessions);
      expect(session!.revokedAt).not.toBeNull();
      expect(session!.revokedReason).toBe("refresh_token_reuse");
    });

    it("rejects a refresh against a revoked session", async () => {
      await seedUser("teacher@example.com", "pw", schoolA);
      const first = await auth.login("teacher@example.com", "pw", {});

      await auth.logout(first.refreshToken);

      await expect(auth.refresh(first.refreshToken, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects refresh once the user is suspended", async () => {
      const { user } = await seedUser("teacher@example.com", "pw", schoolA);
      const first = await auth.login("teacher@example.com", "pw", {});

      await harness.db
        .update(users)
        .set({ status: "SUSPENDED" })
        .where(eq(users.id, user.id));

      await expect(auth.refresh(first.refreshToken, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("keeps the session bound to its original school", async () => {
      await seedUser("teacher@example.com", "pw", schoolA);
      const first = await auth.login("teacher@example.com", "pw", {});
      const second = await auth.refresh(first.refreshToken, {});

      expect(second.user.schoolId).toBe(schoolA);
    });
  });

  /**
   * REGRESSION GUARD.
   *
   * Every other test in this file runs as the PGlite superuser, which
   * bypasses Row-Level Security — so an RLS policy that blocks the login
   * path passes them all and still breaks in production.
   *
   * That is exactly what happened: school_memberships carried a
   * tenant_isolation policy, and because login reads it BEFORE any tenant
   * exists, every real login failed with "Invalid email or password."
   * Only an end-to-end request against PostgreSQL caught it.
   *
   * This test closes that gap by exercising login as the non-owning
   * application role, with policies actually in force.
   */
  describe("under Row-Level Security (as the application role)", () => {
    it("logs in successfully even though no tenant is bound yet", async () => {
      await seedUser("rls@example.com", "pw", schoolA);

      const result = await harness.asAppRole(async () =>
        auth.login("rls@example.com", "pw", {}),
      );

      expect(result.user.schoolId).toBe(schoolA);
      expect(result.accessToken).toBeTruthy();
    });

    it("refreshes successfully with policies in force", async () => {
      await seedUser("rls2@example.com", "pw", schoolA);

      const rotated = await harness.asAppRole(async () => {
        const first = await auth.login("rls2@example.com", "pw", {});
        return auth.refresh(first.refreshToken, {});
      });

      expect(rotated.accessToken).toBeTruthy();
      expect(rotated.user.schoolId).toBe(schoolA);
    });
  });

  describe("logout", () => {
    it("revokes the session", async () => {
      await seedUser("teacher@example.com", "pw", schoolA);
      const result = await auth.login("teacher@example.com", "pw", {});

      await auth.logout(result.refreshToken);

      const [session] = await harness.db.select().from(sessions);
      expect(session!.revokedAt).not.toBeNull();
      expect(session!.revokedReason).toBe("logout");
    });

    it("is idempotent and silent for an unknown token", async () => {
      await expect(auth.logout("unknown-token")).resolves.toBeUndefined();
    });
  });
});
