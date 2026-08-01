import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { TenantContext } from "./tenant-context";

/**
 * Layer 1. These two behaviours are what stop an un-scoped query from ever
 * meaning "every tenant".
 */
describe("TenantContext", () => {
  it("returns the bound schoolId", () => {
    const ctx = new TenantContext();
    ctx.bind("11111111-1111-1111-1111-111111111111");
    expect(ctx.schoolId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("fails closed when unbound, rather than defaulting to no filter", () => {
    const ctx = new TenantContext();
    expect(() => ctx.schoolId).toThrow(UnauthorizedException);
  });

  it("refuses to rebind, so one request cannot cross tenants", () => {
    const ctx = new TenantContext();
    ctx.bind("11111111-1111-1111-1111-111111111111");

    expect(() => ctx.bind("22222222-2222-2222-2222-222222222222")).toThrow(
      /already bound/i,
    );

    /* The original tenant survives the attempt. */
    expect(ctx.schoolId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("rejects an empty schoolId", () => {
    const ctx = new TenantContext();
    expect(() => ctx.bind("")).toThrow();
  });

  it("reports bound state without triggering the fail-closed throw", () => {
    const ctx = new TenantContext();
    expect(ctx.isBound).toBe(false);
    ctx.bind("11111111-1111-1111-1111-111111111111");
    expect(ctx.isBound).toBe(true);
  });
});
