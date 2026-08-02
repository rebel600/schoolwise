import { expect, test } from "@playwright/test";

/**
 * End-to-end authentication.
 *
 * Exercises the whole stack in a real browser: the Single-SPA shell resolves
 * a session, mounts the auth micro frontend, submits a form to the NestJS
 * API, and stores the token in a module that BOTH the shell and the micro
 * frontend share through the import map.
 *
 * Unit tests cannot cover the part that has broken most often here — module
 * identity across dev-server origins. Two copies of lib-api-client means two
 * token stores, and login silently appears not to work.
 *
 * Requires: docker compose up, migrations, seed, API on :3000, `bun run dev`.
 */

const ADMIN = {
  email: "admin@riverside-high.test",
  password: "Password123!",
};

test.describe("authentication", () => {
  test("an unauthenticated visitor is sent to the login screen", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: /sign in to schoolwise/i }),
    ).toBeVisible();
  });

  test("client-side validation rejects a malformed email", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("whatever");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();

    /* Validation happened locally — no request should have been made. */
    await expect(page).toHaveURL(/\/login$/);
  });

  test("wrong credentials show one generic message", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(/invalid email or password/i);
  });

  test("an unknown email gives the SAME message as a wrong password", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("nobody@riverside-high.test");
    await page.getByLabel("Password").fill("whatever-at-all");
    await page.getByRole("button", { name: "Sign in" }).click();

    /* Distinguishable messages would enumerate valid accounts. */
    await expect(page.getByRole("alert")).toHaveText(
      /invalid email or password/i,
    );
  });

  test("valid credentials sign the user in and leave the login screen", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
  });

  test("the refresh token is httpOnly and the access token never reaches storage", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });

    const cookies = await context.cookies();
    const refresh = cookies.find((c) => c.name === "schoolwise_refresh");

    expect(refresh, "refresh cookie should be set").toBeDefined();
    expect(refresh!.httpOnly, "refresh cookie must be httpOnly").toBe(true);
    expect(refresh!.sameSite).toBe("Strict");

    /*
     * ADR-0005: the access token lives in memory only. Anything in web
     * storage is readable by any script on the origin, so an XSS would lift
     * it straight out.
     */
    const storage = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    }));

    expect(storage.local).not.toMatch(/eyJ/); // no JWT
    expect(storage.session).not.toMatch(/eyJ/);
    expect(storage.local).not.toMatch(/accessToken/i);
  });

  test("a reload restores the session from the httpOnly cookie", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });

    /*
     * The in-memory access token is gone after a reload — deliberately. The
     * shell calls /auth/refresh once at boot, and the httpOnly cookie
     * restores the session without the user signing in again.
     */
    await page.reload();

    await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
  });

  test("the forgot-password flow never reveals whether an account exists", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /forgot your password/i }).click();

    await expect(
      page.getByRole("heading", { name: /reset your password/i }),
    ).toBeVisible();

    await page.getByLabel("Email").fill("definitely-not-a-user@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();

    /* Identical wording whether or not the address is registered. */
    await expect(page.getByRole("alert")).toHaveText(
      /if that address has an account/i,
    );
  });
});
