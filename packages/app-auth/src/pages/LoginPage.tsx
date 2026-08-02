import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { authStore } from "@school-wise/lib-api-client";
import { loginSchema, type LoginRequest } from "@school-wise/lib-types";
import { Alert, Button, Input, Label } from "@school-wise/styleguide";

import { useAuth } from "../useAuth";

interface LoginPageProps {
  onForgotPassword: () => void;
}

export function LoginPage({ onForgotPassword }: LoginPageProps) {
  const { pending, error } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    /*
     * The SAME schema the backend validates with, imported from
     * lib-types. Client validation is for responsiveness; the server still
     * validates, and the two can no longer drift.
     */
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await authStore.login(values);
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Sign in to SchoolWise
          </h1>
          <p className="text-sm text-gray-500">
            Use the account provided by your school.
          </p>
        </header>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {/* noValidate: our messages are more useful than the browser's,
            and Zod already validates on submit. */}
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@school.edu"
              invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <p id="email-error" className="text-sm text-red-600">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password ? (
              <p id="password-error" className="text-sm text-red-600">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 underline-offset-4 hover:underline"
          >
            Forgot your password?
          </button>
        </div>
      </div>
    </main>
  );
}
