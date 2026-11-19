import { useEffect, useState } from "react";
import { api, ApiError, type ProfileCard } from "@/lib/api";

type Entry = {
  at: number;
  promise: Promise<ProfileCard | null>;
  value?: ProfileCard | null;
};

const TTL = 60_000;
const entries = new Map<string, Entry>();

export function loadProfileCard(handle: string): Promise<ProfileCard | null> {
  const key = handle.toLowerCase();
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.promise;
  const entry: Entry = {
    at: Date.now(),
    promise: api.profileCard(key).then(
      (card) => {
        entry.value = card;
        return card;
      },
      (error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          entry.value = null;
          return null;
        }
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      },
    ),
  };
  entries.set(key, entry);
  return entry.promise;
}

export function peekProfileCard(handle: string) {
  return entries.get(handle.toLowerCase())?.value;
}

export function invalidateProfileCard(handle: string) {
  entries.delete(handle.toLowerCase());
}

export function patchProfileCard(handle: string, patch: Partial<ProfileCard>) {
  const entry = entries.get(handle.toLowerCase());
  if (!entry?.value) return;
  entry.value = { ...entry.value, ...patch };
  entry.promise = Promise.resolve(entry.value);
}

export function useProfileCard(handle: string, enabled = true) {
  const [state, setState] = useState<{
    handle: string;
    card: ProfileCard | null | undefined;
    failed: boolean;
  }>(() => ({
    handle,
    card: peekProfileCard(handle),
    failed: false,
  }));
  const current =
    state.handle === handle
      ? state
      : { handle, card: peekProfileCard(handle), failed: false };
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadProfileCard(handle).then(
      (card) => {
        if (live) setState({ handle, card, failed: false });
      },
      () => {
        if (live) setState({ handle, card: undefined, failed: true });
      },
    );
    return () => {
      live = false;
    };
  }, [handle, enabled]);
  return { card: current.card, failed: current.failed };
}

const existence = new Map<
  string,
  { at: number; promise: Promise<boolean>; value?: boolean }
>();

function checkHandle(handle: string) {
  const hit = existence.get(handle);
  if (hit && Date.now() - hit.at < TTL) return hit.promise;
  const entry: { at: number; promise: Promise<boolean>; value?: boolean } = {
    at: Date.now(),
    promise: api.mentionSuggestions(handle).then(
      ({ users }) => {
        entry.value = users.some((user) => user.handle === handle);
        return entry.value;
      },
      () => {
        if (existence.get(handle) === entry) existence.delete(handle);
        return false;
      },
    ),
  };
  existence.set(handle, entry);
  return entry.promise;
}

export function handleExists(handle: string) {
  return existence.get(handle)?.value === true || !!peekProfileCard(handle);
}

export function useExistingHandles(handles: readonly string[]) {
  const key = handles.join(",");
  const [known, setKnown] = useState<ReadonlySet<string>>(
    () => new Set(handles.filter(handleExists)),
  );
  useEffect(() => {
    if (!key) return;
    let live = true;
    const timer = setTimeout(() => {
      Promise.all(
        key
          .split(",")
          .map((handle) =>
            checkHandle(handle).then((ok) => (ok ? handle : null)),
          ),
      ).then((found) => {
        if (live) setKnown(new Set(found.filter((handle) => handle !== null)));
      });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key]);
  return known;
}
