import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  api,
  errorMessage,
  type GifSearchItem,
  type PollDraft,
  type Post,
  type RepostAudience,
  type RepostContext,
  type Session,
} from "@/lib/api";
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
  isVoting,
  projectPost,
  rememberPosts,
  subscribeToActions,
} from "./optimistic-actions";
import { toast } from "@/components/ui/toast-manager";
import { projectRepostContext } from "./repost-context";

// Feed pages (home, or one topic's) survive navigation, so coming back from a post shows the same
// list instantly (and can restore the scroll position) while it revalidates.
const feedCache = new Map<
  string,
  {
    posts: Post[];
    repostedBy: Record<string, RepostContext>;
    nextCursor: string | null;
  }
>();

export function useFeed(
  session: Session | null,
  parentId?: string,
  autoLoad = true,
  onPublished?: () => void,
  /** Only posts and replies with this normalized topic. */
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
  // Which posts are here because someone reposted them (home feed only).
  const [repostedBy, setRepostedBy] = useState<Record<string, RepostContext>>(
    cached?.repostedBy ?? {},
  );
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
      (topic
        ? entry.post.topics.includes(topic)
        : entry.post.parentId === (parentId ?? null)),
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
        // The page is authoritative for the posts it holds, including their order:
        // a repost can lift an older post back to the top.
        const pageIds = new Set(page.posts.map((post) => post.id));
        setRepostedBy((current) =>
          revalidate || cursor
            ? {
                ...Object.fromEntries(
                  Object.entries(current).filter(([id]) => !pageIds.has(id)),
                ),
                ...page.repostedBy,
              }
            : page.repostedBy,
        );
        setFeedPosts((current) =>
          revalidate
            ? [
                ...page.posts,
                ...current.filter((existing) => !pageIds.has(existing.id)),
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
    feedCache.set(cacheKey, { posts: feedPosts, repostedBy, nextCursor });
  }, [cacheKey, feedPosts, repostedBy, nextCursor]);
  useEffect(() => {
    if (!autoLoad) return;
    const controller = new AbortController();
    // HTTP completes asynchronously; cleanup cancels stale responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(undefined, controller.signal, !!cached);
    return () => controller.abort();
  }, [load, session, autoLoad, cached]);
  function publishPost(
    text: string = draft,
    gif: GifSearchItem | null = null,
    poll?: PollDraft,
  ) {
    const content = text.trim();
    if (
      !session?.authenticated ||
      session.needsOnboarding ||
      (!content && !gif && !poll) ||
      Array.from(content).length > 2000
    )
      return;
    const sending = publishOptimistically({
      content,
      gif,
      poll,
      author: session.user,
      parentId: parentId ?? null,
      onConfirmed: onPublished,
    });
    setDraft("");
    return sending;
  }
  /** Quote a post: a new top-level post embedding it, whatever feed this is. */
  function publishQuote(
    quoted: Post,
    text: string,
    gif: GifSearchItem | null = null,
    poll?: PollDraft,
    onConfirmed?: (post: Post) => void,
  ) {
    const content = text.trim();
    if (
      !session?.authenticated ||
      session.needsOnboarding ||
      (!content && !gif && !poll) ||
      Array.from(content).length > 2000
    )
      return;
    return publishOptimistically({
      content,
      gif,
      poll,
      author: session.user,
      parentId: null,
      quoting: quoted,
      onConfirmed,
    });
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
      .filter((post) => post !== null)
      .filter((post) => !topic || post.topics.includes(topic)),
    resolvePost: (post: Post) => projectPost(post, viewerId),
    /**
     * The "X reposted" label for a post in this list. Pass `base` and turn
     * `synthesize` off for lists that bring their own context, such as a profile.
     */
    repostContext: (
      post: Post,
      base: RepostContext | undefined = repostedBy[post.id],
      // Only the home feed lists reposts; topic and reply lists never do.
      synthesize = !topic && parentId === undefined,
    ) =>
      projectRepostContext(
        post,
        base,
        session?.authenticated && !session.needsOnboarding
          ? session.user
          : null,
        synthesize,
      ),
    publishQuote,
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
    /** Repost with an audience, or undo the repost with `null`. */
    setRepost: (post: Post, audience: RepostAudience | null) =>
      viewerId
        ? mutatePost(post, viewerId, {
            kind: "repost",
            value: audience !== null,
            audience: audience ?? "public",
          })
        : false,
    isVoting: (post: Post) => !!viewerId && isVoting(post.id, viewerId),
    vote: (post: Post, optionIndex: number) =>
      viewerId
        ? mutatePost(post, viewerId, { kind: "vote", optionIndex })
        : false,
    editPost: (post: Post, content: string) => {
      const trimmed = content.trim();
      return viewerId &&
        (trimmed || post.gif || post.poll) &&
        Array.from(trimmed).length <= 2000
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
