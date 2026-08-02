import type { Request } from "express";

/**
 * Request carrying an authenticated principal.
 *
 * `user` is populated by JwtAuthGuard from the VERIFIED token, and nothing
 * else may write it. `schoolId` here is the authoritative tenant — the value
 * TenantInterceptor binds.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    schoolId: string;
    membershipId: string;
    roles: string[];
    permissions: string[];
    sessionId: string;
  };
}
