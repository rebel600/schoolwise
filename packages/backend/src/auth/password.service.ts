import { Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id password hashing.
 *
 * Argon2id is the hybrid variant: it resists both GPU cracking (via memory
 * hardness) and side-channel attacks. Parameters follow OWASP guidance —
 * 19 MiB memory, 2 iterations, 1 degree of parallelism.
 *
 * The salt is generated per hash and embedded in the output string, so no
 * separate salt column exists.
 */
@Injectable()
export class PasswordService {
  private readonly options = {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  } as const;

  async hash(plaintext: string): Promise<string> {
    return hash(plaintext, this.options);
  }

  /**
   * Returns false rather than throwing on a malformed stored hash.
   *
   * A corrupt hash must read as "wrong password", not as a 500. A 500 tells
   * an attacker that the account exists and its record is unusual.
   */
  async verify(storedHash: string, plaintext: string): Promise<boolean> {
    try {
      return await verify(storedHash, plaintext, this.options);
    } catch {
      return false;
    }
  }
}
