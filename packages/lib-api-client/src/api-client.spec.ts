import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClient, ApiError } from "./api-client";
import { tokenStore } from "./token-store";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ApiClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tokenStore.clear();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unwraps the success envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { id: "1" }, timestamp: "" }),
    );

    const client = new ApiClient({ baseUrl: "/api" });
    await expect(client.get("/thing")).resolves.toEqual({ id: "1" });
  });

  it("sends the bearer token when one is held", async () => {
    tokenStore.set("token-abc");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "" }),
    );

    await new ApiClient({ baseUrl: "/api" }).get("/thing");

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer token-abc",
    );
  });

  it("always sends credentials, so the httpOnly refresh cookie travels", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, timestamp: "" }),
    );

    await new ApiClient({ baseUrl: "/api" }).get("/thing");

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.credentials).toBe("include");
  });

  it("surfaces field errors from a validation failure", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          message: "Validation failed.",
          errors: [{ field: "email", message: "Invalid." }],
          timestamp: "",
        },
        400,
      ),
    );

    const error = await new ApiClient({ baseUrl: "/api" })
      .post("/thing", {})
      .catch((e: unknown) => e as ApiError);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isValidationError).toBe(true);
    expect((error as ApiError).fieldErrors).toEqual([
      { field: "email", message: "Invalid." },
    ]);
  });

  describe("401 handling", () => {
    it("refreshes once and retries the original request", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ success: false, message: "", timestamp: "" }, 401),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            success: true,
            data: { accessToken: "fresh" },
            timestamp: "",
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ success: true, data: { ok: true }, timestamp: "" }),
        );

      const client = new ApiClient({ baseUrl: "/api" });

      await expect(client.get("/thing")).resolves.toEqual({ ok: true });
      expect(tokenStore.get()).toBe("fresh");
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    /**
     * The critical one.
     *
     * Refresh tokens ROTATE, and the backend treats a second use of a
     * rotated token as theft — it revokes the whole session family. So if
     * five concurrent 401s each triggered their own refresh, four would
     * present an already-used token and the user would be logged out.
     *
     * One shared in-flight promise is what prevents that.
     */
    it("performs exactly ONE refresh for concurrent 401s", async () => {
      let refreshCalls = 0;

      fetchMock.mockImplementation((url: string) => {
        if (typeof url === "string" && url.endsWith("/auth/refresh")) {
          refreshCalls += 1;
          return Promise.resolve(
            jsonResponse({
              success: true,
              data: { accessToken: "fresh" },
              timestamp: "",
            }),
          );
        }

        if (!tokenStore.get()) {
          return Promise.resolve(
            jsonResponse({ success: false, message: "", timestamp: "" }, 401),
          );
        }

        return Promise.resolve(
          jsonResponse({ success: true, data: { ok: true }, timestamp: "" }),
        );
      });

      const client = new ApiClient({ baseUrl: "/api" });

      const results = await Promise.all([
        client.get("/a"),
        client.get("/b"),
        client.get("/c"),
        client.get("/d"),
        client.get("/e"),
      ]);

      expect(refreshCalls).toBe(1);
      expect(results).toHaveLength(5);
    });

    it("clears the token and notifies when refresh fails", async () => {
      const onSessionExpired = vi.fn();

      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ success: false, message: "", timestamp: "" }, 401),
        )
        .mockResolvedValueOnce(
          jsonResponse({ success: false, message: "", timestamp: "" }, 401),
        );

      tokenStore.set("stale");

      const client = new ApiClient({ baseUrl: "/api", onSessionExpired });

      await expect(client.get("/thing")).rejects.toThrow(ApiError);
      expect(tokenStore.get()).toBeNull();
      expect(onSessionExpired).toHaveBeenCalledOnce();
    });

    it("does not attempt a refresh when skipAuthRetry is set", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { success: false, message: "Invalid.", timestamp: "" },
          401,
        ),
      );

      const client = new ApiClient({ baseUrl: "/api" });

      await expect(
        client.post("/auth/login", {}, { skipAuthRetry: true }),
      ).rejects.toThrow(ApiError);

      /* One call only — no refresh loop on the login endpoint itself. */
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe("tokenStore", () => {
  beforeEach(() => tokenStore.clear());

  it("holds the token in memory only, never in web storage", () => {
    tokenStore.set("secret-token");

    expect(tokenStore.get()).toBe("secret-token");

    /*
     * The whole point of ADR-0005: web storage is readable by any script on
     * the origin, so an XSS would lift the token straight out of it.
     */
    expect(localStorage.getItem("secret-token")).toBeNull();
    expect(Object.values(localStorage)).not.toContain("secret-token");
    expect(Object.values(sessionStorage)).not.toContain("secret-token");
  });

  it("notifies subscribers on change", () => {
    const listener = vi.fn();
    const unsubscribe = tokenStore.subscribe(listener);

    tokenStore.set("a");
    expect(listener).toHaveBeenCalledWith("a");

    unsubscribe();
    tokenStore.set("b");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
