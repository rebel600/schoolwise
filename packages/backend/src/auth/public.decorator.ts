import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Opts a route OUT of the global JwtAuthGuard.
 *
 * Protection is opt-out rather than opt-in deliberately: forgetting a
 * decorator then yields a 401 on the first test run, instead of silently
 * shipping an unprotected endpoint that nothing fails on.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
