import { registerApplication, start, type LifeCycles } from "single-spa";

/**
 * Micro frontend registry.
 *
 * Module specifiers are held in variables so Vite's static analyzer does not
 * attempt to resolve them at build time — they are resolved at runtime from the
 * import map declared in index.html.
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
  },
] as const;

function activeWhenRoutes(routes: readonly string[]) {
  return (location: Location) =>
    routes.some(
      (route) =>
        location.pathname === route ||
        location.pathname.startsWith(`${route}/`),
    );
}

function initRouter() {
  // Until the shell resolves a session, "/" has no owning application.
  // Replaced by session-aware workspace resolution in Phase 5.
  if (window.location.pathname === "/") {
    window.history.replaceState(null, "", "/login");
  }

  const domElement = document.getElementById("root");

  if (!domElement) {
    throw new Error(
      'Root container "#root" not found. The shell cannot mount micro frontends.',
    );
  }

  for (const { name, routes } of APPLICATIONS) {
    registerApplication({
      name,
      app: () => import(/* @vite-ignore */ name) as Promise<LifeCycles>,
      activeWhen: activeWhenRoutes(routes),
      customProps: { domElement },
    });
  }

  start();
}

initRouter();
