import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedRequest } from "../tenancy/authenticated-request";

import type { Permission } from "./permissions";
import { PERMISSIONS_KEY } from "./permissions.decorator";

/**
 * Fine-grained authorization.
 *
 * Permissions come from the verified token, which derives them from the
 * caller's membership role at login. They are re-derived on every refresh,
 * so a role change takes effect within one access-token lifetime.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = new Set(request.user?.permissions ?? []);

    /* ALL required permissions, not any — the stricter reading. */
    const missing = required.filter((p) => !granted.has(p));

    if (missing.length > 0) {
      throw new ForbiddenException(
        "You do not have permission to perform this action.",
      );
    }

    return true;
  }
}
