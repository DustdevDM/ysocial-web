import { useEffect, useRef, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import {
  ComposerSkeleton,
  PostListSkeleton,
} from "@/components/loading-skeletons";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { PostComposer } from "./post-composer";
import { PostCard } from "./post-card";
import type { FeedState } from "./use-feed";
import { PullToRefresh } from "./pull-to-refresh.tsx";

// Start fetching the next page while the reader is still this far (in px)
// above the end of the list, so new posts are usually there before they scroll.
const PREFETCH_DISTANCE = 900;

export function Feed({
  feed,
  refreshKey,
  header,
  showComposer = true,
  emptyMessage = "No posts yet.",
}: {
  feed: FeedState;
  refreshKey?: string;
  /** Shown where the composer would be, e.g. a topic's title. */
  header?: ReactNode;
  showComposer?: boolean;
  emptyMessage?: string;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const { loadMore, loading, error, feedPosts } = feed;
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !loadMore || loading || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      {
        root: target.closest(".content-scroll"),
        rootMargin: `0px 0px ${PREFETCH_DISTANCE}px 0px`,
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
    // feedPosts.length: a fresh observer re-checks whether the end is still
    // close after every page, which keeps short pages loading until it isn't.
  }, [loadMore, loading, error, feedPosts.length]);
  return (
    <PullToRefresh
      disabled={feed.loading}
      onRefresh={feed.refresh}
      refreshKey={refreshKey}
    >
      {header}
      {showComposer && (
        <div className="min-h-13 md:min-h-14">
          {feed.sessionLoading ? (
            <ComposerSkeleton />
          ) : (
            <PostComposer feed={feed} />
          )}
        </div>
      )}
      <div className="mx-auto mt-6 w-full max-w-xl divide-y divide-border">
        {feed.error && (
          <div role="alert" className="py-3">
            <p>{feed.error}</p>
            <IconButton label="Reload posts" onClick={() => void feed.retry()}>
              <RotateCcw />
            </IconButton>
          </div>
        )}
        {feed.feedPosts.map((post) => (
          <PostCard key={post.id} post={post} feed={feed} />
        ))}
        {feed.loading && (
          <PostListSkeleton
            count={feed.feedPosts.length ? 2 : 4}
            label={
              feed.feedPosts.length ? "Loading more posts…" : "Loading posts…"
            }
            lockScroll={feed.feedPosts.length === 0}
          />
        )}
        {!feed.loading && !feed.error && feed.feedPosts.length === 0 && (
          <p className="py-4 text-muted-foreground">{emptyMessage}</p>
        )}
        {feed.loadMore && feed.error && feed.feedPosts.length > 0 && (
          <div className="flex justify-center py-4">
            <Button variant="outline" onClick={() => void feed.loadMore?.()}>
              <RotateCcw aria-hidden="true" />
              Try loading more
            </Button>
          </div>
        )}
      </div>
      {feed.loadMore && (
        <div ref={sentinel} aria-hidden="true" className="h-px" />
      )}
    </PullToRefresh>
  );
}
