import { describe, expect, it } from "vitest";

import { PERMISSIONS, permissionsForRole } from "./permissions";

describe("permission model", () => {
  it("gives students only read access to their own academic data", () => {
    const granted = permissionsForRole("STUDENT");

    expect(granted).toContain(PERMISSIONS.RESULT_READ);
    expect(granted).not.toContain(PERMISSIONS.STUDENT_CREATE);
    expect(granted).not.toContain(PERMISSIONS.RESULT_PUBLISH);
    expect(granted).not.toContain(PERMISSIONS.USER_MANAGE);
  });

  it("lets teachers manage attendance and assignments but not user accounts", () => {
    const granted = permissionsForRole("TEACHER");

    expect(granted).toContain(PERMISSIONS.ATTENDANCE_UPDATE);
    expect(granted).toContain(PERMISSIONS.ASSIGNMENT_REVIEW);
    expect(granted).not.toContain(PERMISSIONS.USER_MANAGE);
    expect(granted).not.toContain(PERMISSIONS.STUDENT_DELETE);
  });

  it("escalates strictly: student ⊂ teacher ⊂ principal ⊂ admin", () => {
    const student = permissionsForRole("STUDENT");
    const teacher = permissionsForRole("TEACHER");
    const principal = permissionsForRole("PRINCIPAL");
    const admin = permissionsForRole("ADMIN");

    for (const p of student) expect(teacher).toContain(p);
    for (const p of teacher) expect(principal).toContain(p);
    for (const p of principal) expect(admin).toContain(p);
  });

  /**
   * The cross-tenant escape hatch must never be reachable from a
   * school-level role — it is the one permission that can read another
   * school's data.
   */
  it("grants cross-tenant read to SUPER_ADMIN and to nobody else", () => {
    for (const role of ["STUDENT", "TEACHER", "PRINCIPAL", "ADMIN"]) {
      expect(permissionsForRole(role)).not.toContain(
        PERMISSIONS.PLATFORM_CROSS_TENANT_READ,
      );
    }

    expect(permissionsForRole("SUPER_ADMIN")).toContain(
      PERMISSIONS.PLATFORM_CROSS_TENANT_READ,
    );
  });

  it("fails closed for an unknown role", () => {
    expect(permissionsForRole("NOT_A_ROLE")).toEqual([]);
  });

  it("returns no duplicates despite the inheritance spreads", () => {
    const granted = permissionsForRole("ADMIN");
    expect(granted).toHaveLength(new Set(granted).size);
  });
});
