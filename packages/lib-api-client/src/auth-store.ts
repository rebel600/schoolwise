import type {
  AuthenticatedUser,
  ConfirmPasswordReset,
  LoginRequest,
  LoginResponse,
} from "@school-wise/lib-types";

import { ApiClient } from "./api-client";
import { tokenStore } from "./token-store";

export type SessionStatus =
  /** Before the first refresh attempt — render nothing decisive yet. */
  "unknown" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: SessionStatus;
  user: AuthenticatedUser | null;
  error: string | null;
  pending: boolean;
}

/**
 * A framework-free store.
 *
 * Deliberately NOT built on zustand, and importing no React at all.
 *
 * This package is a runtime SINGLETON shared across micro frontends. Any
 * React it pulled in would become a second React instance beside the one
 * each application already has, and every hook would fail with
 * "Invalid hook call ... Cannot read properties of null". That is not a
 * hypothetical: it is what happened when this store was a zustand store.
 *
 * The shared thing is plain state plus a subscription. Each application
 * binds it to ITS OWN React with `useSyncExternalStore`, which is exactly
 * what that API exists for.
 */
type Listener = () => void;

let state: AuthState = {
  status: "unknown",
  user: null,
  error: null,
  pending: false,
};

const listeners = new Set<Listener>();

function setState(patch: Partial<AuthState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

let client: ApiClient | undefined;

export function configureAuth(options: {
  baseUrl: string;
  onSessionExpired?: () => void;
}): void {
  client = new ApiClient(options);
}

function requireClient(): ApiClient {
  if (!client) {
    throw new Error(
      "configureAuth() must be called before using the auth store.",
    );
  }
  return client;
}

export const authStore = {
  /** Stable reference between changes, so useSyncExternalStore can bail out. */
  getState(): AuthState {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Restores a session on a cold page load.
   *
   * No access token survives a reload — deliberately. The httpOnly refresh
   * cookie does, so one refresh call establishes whether a session exists.
   */
  async bootstrap(): Promise<void> {
    try {
      const data = await requireClient().post<LoginResponse>(
        "/auth/refresh",
        undefined,
        { skipAuthRetry: true },
      );

      tokenStore.set(data.accessToken);
      setState({ status: "authenticated", user: data.user });
    } catch {
      /* No valid cookie. Not an error — just a signed-out visitor. */
      tokenStore.clear();
      setState({ status: "unauthenticated", user: null });
    }
  },

  async login(credentials: LoginRequest): Promise<boolean> {
    setState({ pending: true, error: null });

    try {
      const data = await requireClient().post<LoginResponse>(
        "/auth/login",
        credentials,
        { skipAuthRetry: true },
      );

      tokenStore.set(data.accessToken);
      setState({ status: "authenticated", user: data.user, pending: false });
      return true;
    } catch (error) {
      setState({
        pending: false,
        error: error instanceof Error ? error.message : "Unable to sign in.",
      });
      return false;
    }
  },

  async logout(): Promise<void> {
    try {
      await requireClient().post("/auth/logout", undefined, {
        skipAuthRetry: true,
      });
    } finally {
      /*
       * Cleared even if the request fails. Someone who clicks "sign out"
       * must end up signed out on this device regardless of the network.
       */
      tokenStore.clear();
      setState({ status: "unauthenticated", user: null, error: null });
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    setState({ pending: true, error: null });
    try {
      await requireClient().post(
        "/auth/password-reset",
        { email },
        { skipAuthRetry: true },
      );
    } finally {
      setState({ pending: false });
    }
  },

  async confirmPasswordReset(input: ConfirmPasswordReset): Promise<void> {
    setState({ pending: true, error: null });
    try {
      await requireClient().post(
        "/auth/password-reset/confirm",
        { token: input.token, password: input.password },
        { skipAuthRetry: true },
      );
      setState({ pending: false });
    } catch (error) {
      setState({
        pending: false,
        error:
          error instanceof Error ? error.message : "Unable to reset password.",
      });
      throw error;
    }
  },

  clearError(): void {
    setState({ error: null });
  },
};
