import { api } from "@/lib/api";
import { getActionRevision, rememberPollResults } from "./optimistic-actions";

const REFRESH_MS = 3000;
const BATCH_SIZE = 50;
const NEAR_VIEW_MARGIN = "200px 0px";
const watched = new Map<Element, { id: string; viewerId: string | null }>();
const nearby = new Set<Element>();
let observer: IntersectionObserver | undefined;
let timer: number | undefined;
let active: AbortController | undefined;

async function refresh() {
  if (active || !nearby.size || document.hidden || !navigator.onLine) return;

  const groups = new Map<string | null, Set<string>>();
  for (const element of nearby) {
    const poll = watched.get(element);
    if (!poll) continue;
    const ids = groups.get(poll.viewerId) ?? new Set<string>();
    ids.add(poll.id);
    groups.set(poll.viewerId, ids);
  }

  const controller = new AbortController();
  active = controller;
  try {
    for (const [viewerId, ids] of groups) {
      const batch = [...ids];
      for (let offset = 0; offset < batch.length; offset += BATCH_SIZE) {
        if (controller.signal.aborted) return;
        const startedAt = getActionRevision();
        const { viewerId: currentViewer, results } = await api.pollResults(
          batch.slice(offset, offset + BATCH_SIZE),
          AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
        );
        if (!controller.signal.aborted && currentViewer === viewerId)
          rememberPollResults(results, viewerId, startedAt);
      }
    }
  } catch {
    // Keep the confirmed results visible and try again on the next refresh.
  } finally {
    if (active === controller) active = undefined;
  }
}

function onVisibilityChange() {
  if (document.hidden) active?.abort();
  else void refresh();
}

export function watchPoll(
  element: Element,
  id: string,
  viewerId: string | null,
) {
  watched.set(element, { id, viewerId });
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && watched.has(entry.target))
            nearby.add(entry.target);
          else nearby.delete(entry.target);
        }
      },
      { root: element.closest(".content-scroll"), rootMargin: NEAR_VIEW_MARGIN },
    );
    timer = window.setInterval(() => void refresh(), REFRESH_MS);
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
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    active?.abort();
    active = undefined;
  };
}
