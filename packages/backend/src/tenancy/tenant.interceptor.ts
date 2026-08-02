import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";

import type { AuthenticatedRequest } from "./authenticated-request";
import { TenantContext } from "./tenant-context";

/**
 * Binds the tenant for the request.
 *
 * An INTERCEPTOR, not middleware, and the distinction is load-bearing.
 * NestJS runs:
 *
 *   middleware → guards → interceptors → pipes → handler
 *
 * `req.user` is populated by JwtAuthGuard, so middleware runs too early to
 * see it and would leave every request unbound. Interceptors run after
 * guards, which is the first point where a verified principal exists.
 *
 * `schoolId` is read from the verified JWT and from nowhere else — never a
 * body field, query parameter, path segment, or header.
 *
 * Unauthenticated (`@Public()`) requests are left unbound. TenantContext
 * fails closed, so reaching a repository without authentication throws
 * rather than querying across every tenant.
 *
 * See docs/06-multi-tenancy.md — "Layer 1".
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenant: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const schoolId = request.user?.schoolId;

    if (schoolId && !this.tenant.isBound) {
      this.tenant.bind(schoolId);
    }

    return next.handle();
  }
}
