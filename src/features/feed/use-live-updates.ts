import { useEffect, useEffectEvent } from "react";
import { subscribeToLive, type LivePost } from "@/lib/live-events";

const BATCH_MS = 1200;

/**
 * Runs `refresh` shortly after a relevant post is announced, folding bursts into
 * one run, and after the stream recovers from a gap. A newer run cancels an older one.
 */
export function useLiveUpdates({
  enabled,
  scope,
  relevant,
  refresh,
}: {
  enabled: boolean;
  scope: string;
  relevant: (post: LivePost) => boolean;
  refresh: (signal: AbortSignal) => Promise<void>;
}) {
  const isRelevant = useEffectEvent(relevant);
  const run = useEffectEvent(refresh);
  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    const schedule = (delay: number) => {
      if (timer !== undefined) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        controller?.abort();
        const next = new AbortController();
        controller = next;
        run(next.signal).catch(() => {});
      }, delay);
    };
    const unsubscribe = subscribeToLive({
      onPost: (post) => {
        if (isRelevant(post)) schedule(BATCH_MS);
      },
      onResync: () => schedule(0),
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [enabled, scope]);
}
