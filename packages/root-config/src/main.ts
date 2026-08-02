import { registerApplication, start, type LifeCycles } from "single-spa";

import { authStore, configureAuth } from "@school-wise/lib-api-client";

/**
 * Micro frontend registry.
 *
 * Module specifiers are held in variables so Vite's static analyzer does not
 * attempt to resolve them at build time — they are resolved at runtime from
 * the import map declared in index.html.
 *
 * `activeWhen` is an allow-list of route prefixes owned by each application.
 * Never express it as a deny-list: a deny-list makes every unclaimed route
 * silently activate the application, which is how the auth app previously
 * mounted itself over the entire site.
 */
const APPLICATIONS = [
  {
    name: "@school-wise/app-auth",
    routes: ["/login", "/logout", "/forgot-password", "/reset-password"],
    /** Reachable without a session. Everything else requires one. */
    public: true,
  },
] as const;

const PUBLIC_ROUTES = APPLICATIONS.filter((a) => a.public).flatMap(
  (a) => a.routes,
);

function matchesRoute(pathname: string, routes: readonly string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isPublicRoute(pathname: string): boolean {
  return matchesRoute(pathname, PUBLIC_ROUTES);
}

function navigate(path: string): void {
  if (window.location.pathname === path) return;
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Routes the visitor according to session state.
 *
 * This is a user-experience affordance, not a security control. Every API
 * call is authorized by the backend independently — a user who edits the URL
 * reaches a page that renders nothing useful, because the data behind it is
 * refused. See docs/02-frontend.md — "Security Guidelines".
 */
function applyRouteGuard(): void {
  const { status } = authStore.getState();
  const { pathname } = window.location;

  /* Still resolving the session — decide nothing yet. */
  if (status === "unknown") return;

  if (status === "unauthenticated" && !isPublicRoute(pathname)) {
    navigate("/login");
    return;
  }

  if (
    status === "authenticated" &&
    (pathname === "/" || isPublicRoute(pathname))
  ) {
    /*
     * Placeholder until workspace resolution lands: send every signed-in
     * user to the LMS route. Replaced by role-based default-workspace
     * selection when those applications exist.
     */
    navigate("/lms");
  }
}

async function bootstrap(): Promise<void> {
  const domElement = document.getElementById("root");

  if (!domElement) {
    throw new Error(
      'Root container "#root" not found. The shell cannot mount micro frontends.',
    );
  }

  configureAuth({
    baseUrl:
      import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:3000/api/v1",
    /* A refresh failure mid-session must land the user back at login. */
    onSessionExpired: () => navigate("/login"),
  });

  for (const { name, routes } of APPLICATIONS) {
    registerApplication({
      name,
      app: () => import(/* @vite-ignore */ name) as Promise<LifeCycles>,
      activeWhen: (location) => matchesRoute(location.pathname, routes),
      customProps: { domElement },
    });
  }

  /*
   * Resolve the session BEFORE start(), so the first render already knows
   * whether the visitor is signed in. Starting first would briefly mount the
   * login screen for an authenticated user — a visible flash of the wrong UI.
   */
  await authStore.bootstrap();

  applyRouteGuard();
  authStore.subscribe(applyRouteGuard);
  window.addEventListener("popstate", applyRouteGuard);

  start();
}

void bootstrap();
