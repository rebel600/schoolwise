/**
 * The permission model.
 *
 * Roles are coarse ("who you are"); permissions are fine ("what you may
 * do"). Endpoints check permissions, never roles directly, so changing a
 * role's capabilities is a change in ONE table below rather than a hunt
 * through every controller.
 *
 * See docs/03-backend.md — "Permission-Based Access".
 */

export const PERMISSIONS = {
  STUDENT_READ: "student.read",
  STUDENT_CREATE: "student.create",
  STUDENT_UPDATE: "student.update",
  STUDENT_DELETE: "student.delete",

  TEACHER_READ: "teacher.read",
  TEACHER_CREATE: "teacher.create",
  TEACHER_UPDATE: "teacher.update",

  USER_READ: "user.read",
  USER_MANAGE: "user.manage",

  ATTENDANCE_READ: "attendance.read",
  ATTENDANCE_UPDATE: "attendance.update",

  ASSIGNMENT_READ: "assignment.read",
  ASSIGNMENT_CREATE: "assignment.create",
  ASSIGNMENT_REVIEW: "assignment.review",

  RESULT_READ: "result.read",
  RESULT_PUBLISH: "result.publish",

  DASHBOARD_VIEW: "dashboard.view",
  REPORT_VIEW: "report.view",

  SETTINGS_MANAGE: "settings.manage",
  AUDIT_READ: "audit.read",

  /**
   * Platform-level, granted to no school role. The cross-tenant escape
   * hatch described in docs/06-multi-tenancy.md requires it.
   */
  PLATFORM_CROSS_TENANT_READ: "platform.cross_tenant_read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const STUDENT_PERMISSIONS: Permission[] = [
  PERMISSIONS.ATTENDANCE_READ,
  PERMISSIONS.ASSIGNMENT_READ,
  PERMISSIONS.RESULT_READ,
  PERMISSIONS.DASHBOARD_VIEW,
];

const TEACHER_PERMISSIONS: Permission[] = [
  ...STUDENT_PERMISSIONS,
  PERMISSIONS.STUDENT_READ,
  PERMISSIONS.ATTENDANCE_UPDATE,
  PERMISSIONS.ASSIGNMENT_CREATE,
  PERMISSIONS.ASSIGNMENT_REVIEW,
  PERMISSIONS.REPORT_VIEW,
];

const PRINCIPAL_PERMISSIONS: Permission[] = [
  ...TEACHER_PERMISSIONS,
  PERMISSIONS.TEACHER_READ,
  PERMISSIONS.RESULT_PUBLISH,
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...PRINCIPAL_PERMISSIONS,
  PERMISSIONS.STUDENT_CREATE,
  PERMISSIONS.STUDENT_UPDATE,
  PERMISSIONS.STUDENT_DELETE,
  PERMISSIONS.TEACHER_CREATE,
  PERMISSIONS.TEACHER_UPDATE,
  PERMISSIONS.USER_READ,
  PERMISSIONS.USER_MANAGE,
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.AUDIT_READ,
];

/**
 * Role → permissions.
 *
 * SUPER_ADMIN is deliberately NOT "every permission spread in". It is
 * handled as an explicit branch in the guard, so adding a new dangerous
 * permission does not silently grant it to anyone by virtue of a spread.
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  STUDENT: STUDENT_PERMISSIONS,
  TEACHER: TEACHER_PERMISSIONS,
  PRINCIPAL: PRINCIPAL_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  SUPER_ADMIN: [...ADMIN_PERMISSIONS, PERMISSIONS.PLATFORM_CROSS_TENANT_READ],
};

/** Resolves the permission set for a role, deduplicated. */
export function permissionsForRole(role: string): Permission[] {
  return [...new Set(ROLE_PERMISSIONS[role] ?? [])];
}
