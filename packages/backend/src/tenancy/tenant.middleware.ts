import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { TenantContext } from "./tenant-context";

/**
 * Request carrying an authenticated principal.
 *
 * `user` is populated by JwtAuthGuard from the VERIFIED token. Nothing else
 * may write it.
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

/**
 * Binds the tenant for the request.
 *
 * `schoolId` is read from the verified JWT and from nowhere else. It is never
 * taken from a body field, query parameter, path segment, or header — each of
 * those is attacker-controlled, and accepting one would let any authenticated
 * user address any school's data.
 *
 * Unauthenticated requests are left unbound. `TenantContext` fails closed, so
 * any repository reached without authentication throws rather than querying
 * across every tenant.
 *
 * See docs/06-multi-tenancy.md — "Layer 1".
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenant: TenantContext) {}

  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const schoolId = req.user?.schoolId;

    if (schoolId) {
      this.tenant.bind(schoolId);
    }

    next();
  }
}
