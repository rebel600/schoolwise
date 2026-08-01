import { Injectable, Scope, UnauthorizedException } from "@nestjs/common";

/**
 * The tenant for the current request.
 *
 * Two properties matter, and both are deliberate:
 *
 *   Bind once — rebinding mid-request would let a single request cross
 *   tenants. A second bind throws rather than overwriting.
 *
 *   Fail closed — reading an unbound context throws. It must never fall back
 *   to "no filter", which is how a missing context silently becomes a
 *   full-table read across every school.
 *
 * `schoolId` originates from the verified JWT and from nowhere else. See
 * docs/06-multi-tenancy.md — "Layer 1".
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private schoolIdValue: string | null = null;

  bind(schoolId: string): void {
    if (this.schoolIdValue !== null) {
      throw new Error(
        "Tenant context is already bound for this request. Rebinding would allow one request to cross tenants.",
      );
    }

    if (!schoolId) {
      throw new Error("Cannot bind an empty schoolId to the tenant context.");
    }

    this.schoolIdValue = schoolId;
  }

  get schoolId(): string {
    if (this.schoolIdValue === null) {
      throw new UnauthorizedException("Tenant context is not established.");
    }
    return this.schoolIdValue;
  }

  /** For guards that must branch without triggering the fail-closed throw. */
  get isBound(): boolean {
    return this.schoolIdValue !== null;
  }
}
