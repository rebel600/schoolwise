import type { ThrottlerModuleOptions } from "@nestjs/throttler";

/**
 * Rate limiting.
 *
 * Argon2id makes each password guess expensive for the SERVER too, so an
 * unthrottled login endpoint is both a brute-force target and a cheap
 * denial-of-service vector: an attacker forces ~19 MiB of hashing per
 * request. Throttling is not optional hardening — see ADR-0005.
 *
 * ONE throttler only, deliberately.
 *
 * Every throttler named here is enforced on EVERY route. Defining extra
 * named buckets — an "auth" bucket, a strict "reset" bucket — does not scope
 * them to those routes; it applies all of them globally, so the strictest
 * one silently becomes the limit for the whole API. That mistake throttled
 * every endpoint to 5 requests per 15 minutes and was caught only by an
 * end-to-end run.
 *
 * Stricter routes override this bucket per-handler with
 * `@Throttle({ default: { limit, ttl } })`.
 */
export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [{ name: "default", ttl: 60_000, limit: 120 }],
};

/** Login: brute-force resistant, and generous enough for a real typo. */
export const LOGIN_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

/**
 * Refresh: called once per page load by every visitor, so it must tolerate
 * ordinary reloading. Brute force is not the threat — the token is a 256-bit
 * opaque value and reuse detection revokes the session on a second use.
 */
export const REFRESH_THROTTLE = { default: { limit: 60, ttl: 60_000 } };

/** Password reset: tightest. It sends email and is the enumeration probe. */
export const PASSWORD_RESET_THROTTLE = { default: { limit: 5, ttl: 900_000 } };
