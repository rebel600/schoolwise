import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  passwordResetTokens,
  refreshTokens,
  schoolMemberships,
  schools,
  sessions,
  users,
} from "../database/schema";
import type { MailMessage } from "../mail/mail.service";
import {
  createTestDatabase,
  type TestDatabase,
} from "../testing/test-database";

import { PasswordResetService } from "./password-reset.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

describe("PasswordResetService", () => {
  let harness: TestDatabase;
  let service: PasswordResetService;
  let passwords: PasswordService;
  let schoolId: string;
  /** Captures what WOULD have been emailed, so tests can assert on it. */
  let sent: MailMessage[];

  beforeAll(async () => {
    harness = await createTestDatabase();
    passwords = new PasswordService();
    sent = [];

    const mail = {
      send: async (message: MailMessage) => {
        sent.push(message);
      },
    };

    const config = {
      get: () => "http://localhost:9000",
    } as unknown as ConfigService;

    service = new PasswordResetService(
      harness.db,
      passwords,
      new TokenService(),
      mail as never,
      config as never,
    );

    const [school] = await harness.db
      .insert(schools)
      .values({ slug: "reset-school", name: "Reset School" })
      .returning();
    schoolId = school!.id;
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    sent = [];
    await harness.db.delete(passwordResetTokens);
    await harness.db.delete(refreshTokens);
    await harness.db.delete(sessions);
    await harness.db.delete(schoolMemberships);
    await harness.db.delete(users);
  });

  async function seedUser(
    email: string,
    status: "ACTIVE" | "SUSPENDED" = "ACTIVE",
  ) {
    const [user] = await harness.db
      .insert(users)
      .values({
        email,
        passwordHash: await passwords.hash("OriginalPassword1"),
        firstName: "Test",
        lastName: "User",
        status,
      })
      .returning();

    await harness.db
      .insert(schoolMemberships)
      .values({ schoolId, userId: user!.id, role: "TEACHER" });

    return user!;
  }

  describe("request", () => {
    it("issues a token for a known address", async () => {
      await seedUser("known@example.com");

      const issued = await service.request("known@example.com");

      expect(issued?.token).toBeTruthy();
    });

    /**
     * The enumeration property. An unknown address must be
     * indistinguishable from a known one at the API boundary — the
     * controller returns the same body either way.
     */
    it("returns null for an unknown address, without throwing", async () => {
      const issued = await service.request("nobody@example.com");
      expect(issued).toBeNull();
    });

    it("stores the token hashed, never plaintext", async () => {
      await seedUser("known@example.com");
      const issued = await service.request("known@example.com");

      const [row] = await harness.db.select().from(passwordResetTokens);

      expect(row!.tokenHash).not.toBe(issued!.token);
      expect(row!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("invalidates a previously issued token, so only the newest link works", async () => {
      await seedUser("known@example.com");
      const first = await service.request("known@example.com");
      const second = await service.request("known@example.com");

      await expect(
        service.confirm(first!.token, "BrandNewPassword1"),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.confirm(second!.token, "BrandNewPassword1"),
      ).resolves.toBeUndefined();
    });

    it("emails a link containing the token", async () => {
      await seedUser("known@example.com");
      const issued = await service.request("known@example.com");

      expect(sent).toHaveLength(1);
      expect(sent[0]!.to).toBe("known@example.com");
      expect(sent[0]!.subject).toMatch(/reset your schoolwise password/i);

      /* The link must point at the FRONTEND, not the API. */
      expect(sent[0]!.text).toContain(
        "http://localhost:9000/reset-password?token=" + issued!.token,
      );
    });

    it("sends both a plain-text and an HTML part", async () => {
      await seedUser("known@example.com");
      await service.request("known@example.com");

      /* Gateways that strip HTML must still deliver a usable link. */
      expect(sent[0]!.text).toContain("/reset-password?token=");
      expect(sent[0]!.html).toContain("/reset-password?token=");
    });

    it("sends nothing at all for an unknown address", async () => {
      await service.request("nobody@example.com");
      expect(sent).toHaveLength(0);
    });

    it("issues nothing for a suspended account", async () => {
      await seedUser("susp@example.com", "SUSPENDED");
      expect(await service.request("susp@example.com")).toBeNull();
    });
  });

  describe("confirm", () => {
    it("changes the password", async () => {
      const user = await seedUser("known@example.com");
      const issued = await service.request("known@example.com");

      await service.confirm(issued!.token, "BrandNewPassword1");

      const [updated] = await harness.db
        .select()
        .from(users)
        .where(eq(users.id, user.id));

      expect(
        await passwords.verify(updated!.passwordHash, "BrandNewPassword1"),
      ).toBe(true);
      expect(
        await passwords.verify(updated!.passwordHash, "OriginalPassword1"),
      ).toBe(false);
    });

    it("rejects a reused token", async () => {
      await seedUser("known@example.com");
      const issued = await service.request("known@example.com");

      await service.confirm(issued!.token, "BrandNewPassword1");

      await expect(
        service.confirm(issued!.token, "AnotherPassword12"),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects an unknown token", async () => {
      await expect(
        service.confirm("not-a-real-token", "BrandNewPassword1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects an expired token", async () => {
      await seedUser("known@example.com");
      const issued = await service.request("known@example.com");

      await harness.db
        .update(passwordResetTokens)
        .set({ expiresAt: new Date(Date.now() - 1000) });

      await expect(
        service.confirm(issued!.token, "BrandNewPassword1"),
      ).rejects.toThrow(BadRequestException);
    });

    /**
     * If the reset was triggered because the account was compromised,
     * leaving the attacker's session alive would defeat the whole exercise.
     */
    it("revokes every existing session", async () => {
      const user = await seedUser("known@example.com");

      const [membership] = await harness.db
        .select()
        .from(schoolMemberships)
        .where(eq(schoolMemberships.userId, user.id));

      await harness.db.insert(sessions).values({
        userId: user.id,
        membershipId: membership!.id,
        schoolId,
        expiresAt: new Date(Date.now() + 86_400_000),
      });

      const issued = await service.request("known@example.com");
      await service.confirm(issued!.token, "BrandNewPassword1");

      const [session] = await harness.db.select().from(sessions);
      expect(session!.revokedAt).not.toBeNull();
      expect(session!.revokedReason).toBe("password_reset");
    });
  });
});
