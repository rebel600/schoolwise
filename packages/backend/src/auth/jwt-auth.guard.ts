import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";

import type { Env } from "../config/env";
import type { AuthenticatedRequest } from "../tenancy/authenticated-request";

import type { AccessTokenPayload } from "./access-token-payload";
import { IS_PUBLIC_KEY } from "./public.decorator";

/**
 * Verifies the access token and populates `req.user`.
 *
 * Registered GLOBALLY in AuthModule. Routes opt out with `@Public()`, so a
 * forgotten decorator produces a 401 rather than an unprotected endpoint.
 *
 * `req.user.schoolId` set here is what TenantMiddleware binds. It originates
 * from the verified signature and from nowhere else.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Authentication required.");
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
      });
    } catch {
      /* Expired, tampered, wrong signature — all one message. */
      throw new UnauthorizedException("Authentication required.");
    }

    /*
     * A token missing schoolId cannot establish a tenant. Rejecting here
     * stops it reaching a repository, where TenantContext would throw a less
     * comprehensible error.
     */
    if (!payload.sub || !payload.schoolId || !payload.sessionId) {
      throw new UnauthorizedException("Authentication required.");
    }

    request.user = {
      sub: payload.sub,
      schoolId: payload.schoolId,
      membershipId: payload.membershipId,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      sessionId: payload.sessionId,
    };

    return true;
  }

  private extractBearerToken(header: string | undefined): string | null {
    if (!header) return null;

    const [scheme, value] = header.split(" ");
    return scheme?.toLowerCase() === "bearer" && value ? value : null;
  }
}
