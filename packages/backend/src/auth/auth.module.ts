import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { throttlerConfig } from "../common/throttler.config";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PasswordResetService } from "./password-reset.service";
import { PasswordService } from "./password.service";
import { PermissionsGuard } from "./permissions.guard";
import { RolesGuard } from "./roles.guard";
import { TokenService } from "./token.service";

@Module({
  imports: [JwtModule.register({}), ThrottlerModule.forRoot(throttlerConfig)],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    PasswordService,
    TokenService,
    /*
     * GLOBAL guards. Protection is opt-out via @Public(), never opt-in:
     * a forgotten decorator must produce a 401, not an open endpoint.
     *
     * Order matters — JwtAuthGuard populates req.user, which RolesGuard reads.
     */
    /*
     * ThrottlerGuard runs FIRST. Rate limiting must apply before any
     * expensive work — including the Argon2id hash on the login path, which
     * is ~19 MiB of memory per attempt and therefore a DoS vector if an
     * attacker can trigger it without limit.
     */
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, PasswordResetService, PasswordService, TokenService],
})
export class AuthModule {}
