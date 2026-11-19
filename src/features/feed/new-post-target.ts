import { useSyncExternalStore } from "react";

type Target = { open: () => void; kind?: "post" | "reply" } | null;

let target: Target = null;
const listeners = new Set<() => void>();

export function setNewPostTarget(next: Target) {
  target = next;
  for (const listener of listeners) listener();
}

export function useNewPostTarget() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => target,
    () => null,
  );
}
