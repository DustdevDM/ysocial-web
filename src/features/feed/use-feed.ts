import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, errorMessage, type Post, type Session } from "@/lib/api";
import {
  acknowledgePosts,
  getLocalPosts,
  publishOptimistically,
  subscribeToLocalPosts,
} from "./post-outbox";
import {
  cachedReposts,
  getActionRevision,
  mutatePost,
  projectPost,
  rememberPosts,
  subscribeToActions,
} from "./optimistic-actions";
import { toast } from "@/components/ui/toast-manager";

// Feed pages (home, or one topic's) survive navigation, so coming back from a post shows the same
// list instantly (and can restore the scroll position) while it revalidates.
const feedCache = new Map<
  string,
  { posts: Post[]; nextCursor: string | null }
>();

export function useFeed(
  session: Session | null,
  parentId?: string,
  autoLoad = true,
  onPublished?: () => void,
  /** Only top-level posts with this (normalized) topic. */
  topic?: string,
) {
  const viewerId =
    session?.authenticated && !session.needsOnboarding ? session.user.id : null;
  const cacheKey =
    parentId === undefined
      ? `${viewerId ?? "anonymous"}${topic ? `|topic:${topic}` : ""}`
      : null;
  const [cached] = useState(() =>
    cacheKey === null ? undefined : feedCache.get(cacheKey),
  );
  const [feedPosts, setFeedPosts] = useState<Post[]>(cached?.posts ?? []);
  const [draft, setDraft] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(
    cached?.nextCursor ?? null,
  );
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");
  useSyncExternalStore(subscribeToActions, getActionRevision);
  const localPosts = useSyncExternalStore(subscribeToLocalPosts, getLocalPosts);
  const visibleLocalPosts = localPosts.filter(
    (entry) =>
      entry.post.author.id === viewerId &&
      entry.post.parentId === (parentId ?? null) &&
      (!topic || entry.post.topics.includes(topic)),
  );
  const localIds = new Set(visibleLocalPosts.map((entry) => entry.post.id));
  const optimisticPostIds = visibleLocalPosts
    .filter((entry) => entry.status === "sending")
    .map((entry) => entry.post.id);
  const canPost = !!session?.authenticated && !session.needsOnboarding;
  const load = useCallback(
    async (cursor?: string, signal?: AbortSignal, revalidate = false) => {
      const startedAt = getActionRevision();
      try {
        const page = parentId
          ? await api.replies(parentId, cursor, signal)
          : await api.posts(cursor, signal, topic);
        if (signal?.aborted) return;
        rememberPosts(page.posts, viewerId, startedAt);
        setFeedPosts((current) =>
          revalidate
            ? [
                ...page.posts.filter(
                  (post) =>
                    !current.some((existing) => existing.id === post.id),
                ),
                ...current.map(
                  (existing) =>
                    page.posts.find((post) => post.id === existing.id) ??
                    existing,
                ),
              ]
            : cursor
              ? [
                  ...current,
                  ...page.posts.filter(
                    (post) =>
                      !current.some((existing) => existing.id === post.id),
                  ),
                ]
              : page.posts,
        );
        acknowledgePosts(page.posts);
        if (!revalidate) setNextCursor(page.nextCursor);
        setError("");
      } catch (error) {
        if (!signal?.aborted) setError(errorMessage(error));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [parentId, viewerId, topic],
  );
  useEffect(() => {
    if (cacheKey === null) return;
    feedCache.set(cacheKey, { posts: feedPosts, nextCursor });
  }, [cacheKey, feedPosts, nextCursor]);
  useEffect(() => {
    if (!autoLoad) return;
    const controller = new AbortController();
    // HTTP completes asynchronously; cleanup cancels stale responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(undefined, controller.signal, !!cached);
    return () => controller.abort();
  }, [load, session, autoLoad, cached]);
  function publishPost(text: string = draft) {
    const content = text.trim();
    if (
      !session?.authenticated ||
      session.needsOnboarding ||
      !content ||
      Array.from(content).length > 2000
    )
      return;
    const sending = publishOptimistically({
      content,
      author: session.user,
      parentId: parentId ?? null,
      onConfirmed: onPublished,
    });
    setDraft("");
    return sending;
  }
  async function sharePost(post: Post) {
    const url = new URL(`/posts/${post.id}`, window.location.origin).href;
    try {
      if (navigator.share)
        await navigator.share({
          title: `Post by ${post.author.displayName}`,
          text: post.content,
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const id = toast.add({
          type: "error",
          title: "Couldn't share post",
          description: errorMessage(error),
          timeout: 0,
          actionProps: {
            children: "Retry",
            onClick: () => {
              toast.close(id);
              void sharePost(post);
            },
          },
        });
      }
    }
  }
  return {
    feedPosts: [
      ...visibleLocalPosts.map((entry) => entry.post),
      ...feedPosts.filter((post) => !localIds.has(post.id)),
    ]
      .map((post) => projectPost(post, viewerId))
      .filter((post) => post !== null),
    resolvePost: (post: Post) => projectPost(post, viewerId),
    viewerReposts: viewerId ? cachedReposts(viewerId) : [],
    optimisticPostIds,
    draft,
    setDraft,
    publishPost,
    loading,
    sessionLoading: session === null,
    authenticated: !!session?.authenticated,
    error,
    canPost,
    pending: optimisticPostIds,
    sharePost,
    refresh: () => load(),
    loadMore: nextCursor
      ? () => {
          setLoading(true);
          return load(nextCursor);
        }
      : null,
    retry: () => {
      setLoading(true);
      return load();
    },
    toggleLike: (post: Post) =>
      viewerId
        ? mutatePost(post, viewerId, { kind: "like", value: !post.liked })
        : false,
    toggleRepost: (post: Post) =>
      viewerId
        ? mutatePost(post, viewerId, { kind: "repost", value: !post.reposted })
        : false,
    editPost: (post: Post, content: string) => {
      const trimmed = content.trim();
      return viewerId && trimmed && Array.from(trimmed).length <= 2000
        ? mutatePost(post, viewerId, {
            kind: "edit",
            content: trimmed,
            editedAt: new Date().toISOString(),
          })
        : false;
    },
    deletePost: (post: Post) =>
      viewerId ? mutatePost(post, viewerId, { kind: "delete" }) : false,
    viewerId,
  };
}
export type FeedState = ReturnType<typeof useFeed>;
