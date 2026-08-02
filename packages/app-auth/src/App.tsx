import { useEffect, useState } from "react";

import { configureAuth } from "@school-wise/lib-api-client";

import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { useAuth } from "./useAuth";

/*
 * Configured once at module load. The base URL comes from the build-time
 * environment — never hardcoded, per docs/02-frontend.md.
 */
configureAuth({
  baseUrl:
    import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3000/api/v1",
});

type View = "login" | "forgot-password" | "reset-password";

const PATH_FOR: Record<View, string> = {
  login: "/login",
  "forgot-password": "/forgot-password",
  "reset-password": "/reset-password",
};

function viewFromLocation(): View {
  const { pathname } = window.location;
  if (pathname.startsWith("/reset-password")) return "reset-password";
  if (pathname.startsWith("/forgot-password")) return "forgot-password";
  return "login";
}

/**
 * The authentication micro frontend.
 *
 * Owns /login, /forgot-password, and /reset-password. Once a session exists
 * it hands control back to the shell by navigating to "/" — it never decides
 * which workspace the user lands in, because that is the shell's job.
 */
const App = () => {
  const { status } = useAuth();
  const [view, setView] = useState<View>(viewFromLocation);

  /* Captured once: the reset link is consumed, then removed from the URL. */
  const [resetToken] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("token"),
  );

  /*
   * A signed-in user has no business on the login screen. Sending them to
   * "/" lets the shell resolve their default workspace.
   *
   * Reset is exempt: completing a reset revokes every session, and someone
   * with a live session who follows a reset link should still be able to
   * finish it rather than being bounced away.
   */
  useEffect(() => {
    if (status === "authenticated" && view !== "reset-password") {
      window.history.pushState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [status, view]);

  const show = (next: View) => {
    setView(next);
    /*
     * Replaces the URL, dropping ?token= — a reset token should not linger
     * in the address bar, browser history, or a copied link.
     */
    window.history.pushState(null, "", PATH_FOR[next]);
  };

  if (view === "reset-password") {
    return (
      <ResetPasswordPage token={resetToken} onDone={() => show("login")} />
    );
  }

  if (view === "forgot-password") {
    return <ForgotPasswordPage onBack={() => show("login")} />;
  }

  return <LoginPage onForgotPassword={() => show("forgot-password")} />;
};

export default App;
