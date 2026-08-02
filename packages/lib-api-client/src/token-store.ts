/**
 * The access token, held in a module-scoped variable.
 *
 * NOT localStorage, NOT sessionStorage, NOT a non-httpOnly cookie. All three
 * are readable by any script on the origin, which turns a single XSS into a
 * full account takeover.
 *
 * In memory means the token dies with the tab. That is the intended
 * trade-off: on a cold load the client calls /auth/refresh once, and the
 * httpOnly refresh cookie — which JavaScript cannot read — restores the
 * session.
 *
 * See ADR-0005 and docs/02-frontend.md — "Token handling".
 */
let accessToken: string | null = null;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string | null): void {
    accessToken = token;
    for (const listener of listeners) {
      listener(token);
    }
  },

  clear(): void {
    tokenStore.set(null);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
