import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnv } from "./config/env";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { TenantMiddleware } from "./tenancy/tenant.middleware";
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
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    /*
     * Applied to every route. The middleware leaves unauthenticated requests
     * unbound, and TenantContext fails closed, so a route that skips
     * authentication cannot accidentally query across tenants.
     */
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
