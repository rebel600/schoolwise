import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { Injectable } from "@nestjs/common";

/**
 * Refresh token generation and hashing.
 *
 * A refresh token is an opaque 256-bit random value, NOT a JWT. It carries no
 * claims, so a leaked token discloses nothing about the user, and it can only
 * be validated by matching a stored hash — which means revocation is real
 * rather than "wait for expiry".
 *
 * See ADR-0005.
 */
@Injectable()
export class TokenService {
  /** 32 bytes = 256 bits of entropy. */
  createRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, hash: this.hashRefreshToken(token) };
  }

  /**
   * SHA-256, not Argon2.
   *
   * Password hashing must be slow to resist brute force against low-entropy
   * human input. A refresh token already has 256 bits of entropy, so brute
   * force is not the threat — and a slow hash on every refresh would be a
   * self-inflicted denial of service. What matters is that the stored value
   * is not usable as a credential, which SHA-256 provides.
   */
  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Constant-time comparison, so timing cannot be used to recover a valid
   * hash byte by byte.
   */
  safeEquals(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, "utf8");
    const bufferB = Buffer.from(b, "utf8");

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }
}
