import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
import NumberFlow from "@number-flow/react";
import { ArrowLeft } from "lucide-react";
import { IconLink } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Feed } from "@/features/feed/feed";
import { useFeed } from "@/features/feed/use-feed";
import { useGoBack } from "@/hooks/use-go-back";
import { usePageTitle } from "@/hooks/use-page-title";
import { api, type Session } from "@/lib/api";
import { countFormat } from "@/lib/count-format";

/** Every top-level post that uses a topic, newest first. */
export function TopicPage({
  topic,
  session,
}: {
  topic: string;
  session: Session | null;
}) {
  usePageTitle(`#${topic}`);
  const feed = useFeed(session, undefined, true, undefined, topic);
  const { key: navigationKey } = useLocation();
  const goBack = useGoBack();
  // All posts ever using the topic, not just the ones loaded so far.
  const [total, setTotal] = useState<number | null>(null);
  const loadTotal = useCallback(
    (signal?: AbortSignal) =>
      api
        .topic(topic, signal)
        .then((result) => setTotal(result.topic.posts))
        .catch(() => {}),
    [topic],
  );
  const { loading } = feed;
  const shown = feed.feedPosts.length;
  useEffect(() => {
    // Wait for the feed so both numbers come from the same moment; a changed
    // list (loaded page, deleted post) means the total may have moved too.
    if (loading) return;
    const controller = new AbortController();
    void loadTotal(controller.signal);
    return () => controller.abort();
  }, [loadTotal, loading, shown]);
  const refreshable = {
    ...feed,
    refresh: async () => {
      await Promise.all([feed.refresh(), loadTotal()]);
    },
  };
  return (
    <Feed
      feed={refreshable}
      refreshKey={navigationKey}
      showComposer={false}
      emptyMessage="No posts use this topic yet."
      header={
        <header className="mx-auto w-full max-w-xl">
          <IconLink to="/" label="Back" onClick={goBack}>
            <ArrowLeft />
          </IconLink>
          <h1 className="mt-2 text-2xl font-semibold break-all">#{topic}</h1>
          <div className="mt-1 h-5 text-sm text-muted-foreground tabular-nums">
            {total === null ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <>
                <span aria-hidden="true">
                  <NumberFlow format={countFormat} value={total} />{" "}
                  {total === 1 ? "post" : "posts"}
                </span>
                <span className="sr-only">
                  {total.toLocaleString()} {total === 1 ? "post" : "posts"}
                </span>
              </>
            )}
          </div>
        </header>
      }
    />
  );
}
