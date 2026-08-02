import { useSyncExternalStore } from "react";

import { authStore, type AuthState } from "@school-wise/lib-api-client";

/**
 * Binds the shared auth store to THIS application's React.
 *
 * The store itself is framework-free precisely so it can be a cross-micro-
 * frontend singleton without dragging a second React instance along. Each
 * application supplies its own React here, which is what
 * `useSyncExternalStore` is designed for.
 */
export function useAuth(): AuthState {
  return useSyncExternalStore(
    authStore.subscribe,
    authStore.getState,
    authStore.getState,
  );
}
