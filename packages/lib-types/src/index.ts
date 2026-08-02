import { z } from "zod";

/**
 * Contracts shared between the frontend and the backend.
 *
 * Defined ONCE. The backend validates with these schemas and the frontend
 * validates forms with the same ones, so a field rename becomes a type error
 * rather than a runtime surprise discovered in production.
 *
 * See docs/02-frontend.md — "Types".
 */

/* ------------------------------------------------------------------ auth */

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(320),
  password: z.string().min(1, "Enter your password.").max(256),
  /**
   * Only ever present on login, and only to disambiguate a user who belongs
   * to several schools. No other request carries schoolId — after login the
   * tenant comes from the verified token.
   */
  schoolId: z.string().uuid().optional(),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(320),
});

export const confirmPasswordResetSchema = z
  .object({
    token: z.string().min(1).max(256),
    /* NIST 800-63B: length over composition rules. */
    password: z.string().min(12, "Use at least 12 characters.").max(256),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginRequest = z.infer<typeof loginSchema>;
export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordReset = z.infer<typeof confirmPasswordResetSchema>;

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

/* ----------------------------------------------------------------- roles */

export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "PRINCIPAL",
  "TEACHER",
  "STUDENT",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/* --------------------------------------------------------------- envelope */

/** Every successful response uses this shape. See docs/03-backend.md. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
