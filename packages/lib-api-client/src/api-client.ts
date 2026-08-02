import type { ApiFailure, ApiResponse } from "@school-wise/lib-types";

import { tokenStore } from "./token-store";

export interface ApiClientOptions {
  baseUrl: string;
  /** Called when refresh fails and the session is unrecoverable. */
  onSessionExpired?: () => void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: { field: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the server rejected the input, as opposed to the request. */
  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skips the 401-refresh-retry cycle. Used by the auth calls themselves. */
  skipAuthRetry?: boolean;
  signal?: AbortSignal;
}

/**
 * The single HTTP entry point for every application.
 *
 * Responsibilities: base URL, bearer token, automatic refresh on 401 with
 * request queueing, and mapping the server's error envelope onto typed
 * errors.
 *
 * Applications never construct their own `fetch` wrappers — see
 * docs/02-frontend.md.
 */
export class ApiClient {
  /**
   * The in-flight refresh, if any.
   *
   * Without this, five concurrent 401s trigger five refreshes. Because
   * refresh tokens ROTATE, the second through fifth would present an
   * already-used token — which the backend correctly treats as theft and
   * responds to by revoking the entire session. Concurrent requests would
   * therefore log the user out.
   *
   * Sharing one promise makes the refresh happen exactly once.
   */
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(private readonly options: ApiClientOptions) {}

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);

    if (response.status === 401 && !options.skipAuthRetry) {
      const refreshed = await this.refreshOnce();

      if (!refreshed) {
        tokenStore.clear();
        this.options.onSessionExpired?.();
        throw new ApiError("Your session has expired.", 401);
      }

      const retried = await this.send(path, options);
      return this.parse<T>(retried);
    }

    return this.parse<T>(response);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const token = tokenStore.get();
    const headers: Record<string, string> = {};

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
      /* Required so the httpOnly refresh cookie is sent. */
      credentials: "include",
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }
    if (options.signal) {
      init.signal = options.signal;
    }

    return fetch(`${this.options.baseUrl}${path}`, init);
  }

  /** Deduplicates concurrent refreshes. See `refreshInFlight`. */
  private refreshOnce(): Promise<boolean> {
    this.refreshInFlight ??= this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });

    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const response = await this.send("/auth/refresh", {
        method: "POST",
        skipAuthRetry: true,
      });

      if (!response.ok) {
        return false;
      }

      const payload = (await response.json()) as ApiResponse<{
        accessToken: string;
      }>;

      if (!payload.success) {
        return false;
      }

      tokenStore.set(payload.data.accessToken);
      return true;
    } catch {
      /* Network failure is not a session failure — but we cannot proceed. */
      return false;
    }
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    let payload: ApiResponse<T>;

    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new ApiError(
        "The server returned an unreadable response.",
        response.status,
      );
    }

    if (!response.ok || !payload.success) {
      const failure = payload as ApiFailure;
      throw new ApiError(
        failure.message ?? "Something went wrong.",
        response.status,
        failure.errors ?? [],
      );
    }

    return payload.data;
  }
}
