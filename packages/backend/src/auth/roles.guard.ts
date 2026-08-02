import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedRequest } from "../tenancy/authenticated-request";

import { ROLES_KEY } from "./roles.decorator";

/**
 * Role check, scoped to the caller's school.
 *
 * Roles come from the school MEMBERSHIP embedded in the token, not from the
 * user — the same person may be a Teacher at one school and a Principal at
 * another, and this guard only ever sees the membership the current session
 * is bound to.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.user?.roles ?? [];

    /* SUPER_ADMIN is platform-level and satisfies any role requirement. */
    if (roles.includes("SUPER_ADMIN")) {
      return true;
    }

    if (!required.some((role) => roles.includes(role))) {
      throw new ForbiddenException(
        "You do not have permission to perform this action.",
      );
    }

    return true;
  }
}
