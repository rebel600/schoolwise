import { Global, Module } from "@nestjs/common";

import { TenantContext } from "./tenant-context";

/**
 * Tenant isolation infrastructure.
 *
 * Global because tenant scoping is cross-cutting: every module touching a
 * tenant table needs the context, and requiring each to import it invites
 * someone to skip it.
 */
@Global()
@Module({
  providers: [TenantContext],
  exports: [TenantContext],
})
export class TenancyModule {}
