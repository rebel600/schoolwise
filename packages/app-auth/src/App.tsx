import { useEffect, useState } from "react";

import { configureAuth } from "@school-wise/lib-api-client";

import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { useAuth } from "./useAuth";

/*
 * Configured once at module load. The base URL comes from the build-time
 * environment — never hardcoded, per docs/02-frontend.md.
 */
configureAuth({
  baseUrl:
    import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3000/api/v1",
});

type View = "login" | "forgot-password";

/**
 * The authentication micro frontend.
 *
 * Owns /login and /forgot-password only. Once a session exists it hands
 * control back to the shell by navigating to "/" — it never decides which
 * workspace the user lands in, because that is the shell's job.
 */
const App = () => {
  const { status } = useAuth();
  const [view, setView] = useState<View>(() =>
    window.location.pathname.startsWith("/forgot-password")
      ? "forgot-password"
      : "login",
  );

  /*
   * A signed-in user has no business on the login screen. Sending them to
   * "/" lets the shell resolve their default workspace.
   */
  useEffect(() => {
    if (status === "authenticated") {
      window.history.pushState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [status]);

  const show = (next: View) => {
    setView(next);
    window.history.pushState(
      null,
      "",
      next === "login" ? "/login" : "/forgot-password",
    );
  };

  if (view === "forgot-password") {
    return <ForgotPasswordPage onBack={() => show("login")} />;
  }

  return <LoginPage onForgotPassword={() => show("forgot-password")} />;
};

export default App;
