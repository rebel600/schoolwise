import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { authStore } from "@school-wise/lib-api-client";
import {
  confirmPasswordResetSchema,
  type ConfirmPasswordReset,
} from "@school-wise/lib-types";
import { Alert, Button, Input, Label } from "@school-wise/styleguide";

import { useAuth } from "../useAuth";

interface ResetPasswordPageProps {
  /** Read from ?token= by the caller, never typed by the user. */
  token: string | null;
  onDone: () => void;
}

export function ResetPasswordPage({ token, onDone }: ResetPasswordPageProps) {
  const { pending, error } = useAuth();
  const [succeeded, setSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmPasswordReset>({
    resolver: zodResolver(confirmPasswordResetSchema),
    defaultValues: { token: token ?? "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authStore.confirmPasswordReset(values);
      setSucceeded(true);
    } catch {
      /* The store already surfaced the message; stay on the form. */
    }
  });

  /*
   * A missing token means the link was truncated or hand-typed. Say so
   * instead of rendering a form that cannot possibly succeed.
   */
  if (!token) {
    return (
      <Shell title="Reset your password">
        <Alert variant="error">
          This link is missing its reset token. Request a new one from the sign
          in page.
        </Alert>
        <Button variant="outline" className="w-full" onClick={onDone}>
          Back to sign in
        </Button>
      </Shell>
    );
  }

  if (succeeded) {
    return (
      <Shell title="Password updated">
        <Alert variant="success">
          Your password has been changed, and you have been signed out
          everywhere else. Sign in with your new password.
        </Alert>
        <Button className="w-full" onClick={onDone}>
          Go to sign in
        </Button>
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" {...register("token")} />

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "password-error" : "password-hint"
            }
            {...register("password")}
          />
          {errors.password ? (
            <p id="password-error" className="text-sm text-red-600">
              {errors.password.message}
            </p>
          ) : (
            <p id="password-hint" className="text-sm text-gray-500">
              At least 12 characters. Length matters more than symbols.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "confirm-error" : undefined
            }
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p id="confirm-error" className="text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
