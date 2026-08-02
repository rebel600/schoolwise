import { Module, Scope } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { AuthModule } from "./auth/auth.module";
import { validateEnv } from "./config/env";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { TenantInterceptor } from "./tenancy/tenant.interceptor";
import { TenancyModule } from "./tenancy/tenant.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      /* Fails fast at startup rather than surfacing as a runtime bug. */
      validate: validateEnv,
    }),
    DatabaseModule,
    TenancyModule,
    MailModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    /*
     * An INTERCEPTOR, not middleware. NestJS runs middleware BEFORE guards,
     * so a middleware could never see the `req.user` that JwtAuthGuard
     * populates, and every request would be left unbound.
     *
     * See src/tenancy/tenant.interceptor.ts.
     */
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
      /*
       * Explicit REQUEST scope. It injects the request-scoped TenantContext,
       * and without this Nest instantiates the interceptor as a singleton at
       * bootstrap with no dependencies injected — `this.tenant` is then
       * undefined and every authenticated request 500s.
       */
      scope: Scope.REQUEST,
    },
  ],
})
export class AppModule {}
