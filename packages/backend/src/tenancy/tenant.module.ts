import { Global, Module } from "@nestjs/common";

import { TenantContext } from "./tenant-context";
import { TenantMiddleware } from "./tenant.middleware";

/**
 * Tenant isolation infrastructure.
 *
 * Global because tenant scoping is cross-cutting: every module touching a
 * tenant table needs the context, and requiring each to import it invites
 * someone to skip it.
 */
@Global()
@Module({
  providers: [TenantContext, TenantMiddleware],
  exports: [TenantContext, TenantMiddleware],
})
export class TenancyModule {}
