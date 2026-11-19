import { api } from "@/lib/api";
import { subscribeToLive } from "@/lib/live-events";
import {
  forgetPosts,
  hidePosts,
  getActionRevision,
  rememberPosts,
} from "./optimistic-actions";

const REFRESH_DELAY_MS = 500;
const RETRY_DELAY_MS = 5000;
const BATCH_SIZE = 50;
const NEAR_VIEW_MARGIN = "400px 0px";

type Watched = { id: string; viewerId: string | null };

const watched = new Map<Element, Watched>();
const nearby = new Set<Element>();
const dirty = new Set<string>();
let observer: IntersectionObserver | undefined;
let unsubscribe: (() => void) | undefined;
let timer: number | undefined;
let active: AbortController | undefined;

const keyOf = ({ id, viewerId }: Watched) => `${viewerId ?? "anonymous"}:${id}`;

function schedule(delay = REFRESH_DELAY_MS) {
  if (timer === undefined) timer = window.setTimeout(() => void refresh(), delay);
}

function markDirty(ids?: ReadonlySet<string>) {
  for (const poll of watched.values())
    if (!ids || ids.has(poll.id)) dirty.add(keyOf(poll));
  schedule();
}

async function refresh() {
  timer = undefined;
  if (document.hidden || !navigator.onLine) return;
  if (active) {
    schedule();
    return;
  }
  const groups = new Map<string | null, Set<string>>();
  for (const element of nearby) {
    const post = watched.get(element);
    if (!post || !dirty.delete(keyOf(post))) continue;
    const ids = groups.get(post.viewerId) ?? new Set<string>();
    ids.add(post.id);
    groups.set(post.viewerId, ids);
  }
  if (!groups.size) return;
  const controller = new AbortController();
  active = controller;
  let failed = false;
  try {
    for (const [viewerId, ids] of groups) {
      const list = [...ids];
      for (let offset = 0; offset < list.length; offset += BATCH_SIZE) {
        const batch = list.slice(offset, offset + BATCH_SIZE);
        const startedAt = getActionRevision();
        try {
          const result = await api.postStates(
            batch,
            AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
          );
          if (controller.signal.aborted) return;
          if (result.viewerId !== viewerId) continue;
          rememberPosts(result.posts, viewerId, startedAt);
          hidePosts(result.hiddenIds, viewerId, startedAt);
          const found = new Set([...result.hiddenIds, ...result.posts.map((post) => post.id)]);
          forgetPosts(
            batch.filter((id) => !found.has(id)),
            viewerId,
          );
        } catch {
          failed = true;
          for (const id of batch) dirty.add(keyOf({ id, viewerId }));
        }
      }
    }
  } finally {
    if (active === controller) active = undefined;
    if (failed) schedule(RETRY_DELAY_MS);
    else if (dirty.size) schedule();
  }
}

function onVisibilityChange() {
  if (document.hidden) active?.abort();
}

export function watchPost(
  element: Element,
  id: string,
  viewerId: string | null,
) {
  watched.set(element, { id, viewerId });
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        let reached = false;
        for (const entry of entries) {
          const post = watched.get(entry.target);
          if (!post) continue;
          if (entry.isIntersecting) {
            nearby.add(entry.target);
            reached ||= dirty.has(keyOf(post));
          } else nearby.delete(entry.target);
        }
        if (reached) schedule();
      },
      {
        root: element.closest(".content-scroll"),
        rootMargin: NEAR_VIEW_MARGIN,
      },
    );
    unsubscribe = subscribeToLive({
      onChange: (ids) => markDirty(new Set(ids)),
      onResync: () => markDirty(),
    });
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  observer.observe(element);

  return () => {
    observer?.unobserve(element);
    watched.delete(element);
    nearby.delete(element);
    if (watched.size) return;
    observer?.disconnect();
    observer = undefined;
    unsubscribe?.();
    unsubscribe = undefined;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.clearTimeout(timer);
    timer = undefined;
    active?.abort();
    active = undefined;
    dirty.clear();
  };
}
