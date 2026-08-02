import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { authStore } from "@school-wise/lib-api-client";
import {
  requestPasswordResetSchema,
  type RequestPasswordReset,
} from "@school-wise/lib-types";
import { Alert, Button, Input, Label } from "@school-wise/styleguide";

import { useAuth } from "../useAuth";

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const { pending } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordReset>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await authStore.requestPasswordReset(values.email);
    /*
     * Shown whether or not the address is registered. Confirming which
     * emails have accounts would turn this form into a user-enumeration
     * oracle — the backend is deliberately silent about it too.
     */
    setSubmitted(true);
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Reset your password
          </h1>
          <p className="text-sm text-gray-500">
            We&apos;ll email you a link to choose a new one.
          </p>
        </header>

        {submitted ? (
          <>
            <Alert variant="success">
              If that address has an account, a reset link is on its way. The
              link expires in one hour.
            </Alert>
            <Button variant="outline" className="w-full" onClick={onBack}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@school.edu"
                  invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "reset-email-error" : undefined
                  }
                  {...register("email")}
                />
                {errors.email ? (
                  <p id="reset-email-error" className="text-sm text-red-600">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={onBack}
                className="text-sm text-blue-600 underline-offset-4 hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
