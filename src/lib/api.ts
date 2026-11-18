import { z } from "zod";
import { beginConnectionRetry } from "./connection-status";

export const bannerCropSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type BannerCrop = z.infer<typeof bannerCropSchema>;
const userSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});
const activityUserSchema = userSchema.extend({ optionLabel: z.string().optional() });
const postGifSchema = z.object({ url: z.string(), title: z.string() });
export const pollDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(6).refine(
    (options) => new Set(options.map((option) => option.toLowerCase())).size === options.length,
  ),
  anonymous: z.boolean(),
});
const pollSchema = pollDraftSchema.extend({
  options: z.array(z.object({ label: z.string(), votes: z.number().int().nonnegative() })),
  selectedOption: z.number().int().nonnegative().nullable(),
});
export type PollDraft = z.infer<typeof pollDraftSchema>;
export type Poll = z.infer<typeof pollSchema>;
const basePostSchema = z.object({
  mentions: z
    .array(
      z.object({ id: z.string(), handle: z.string(), username: z.string() }),
    )
    .default([]),
  id: z.string(),
  parentId: z.string().nullable(),
  content: z.string(),
  gif: postGifSchema.nullable().default(null),
  poll: pollSchema.nullable().default(null),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
  editExpiresAt: z.string(),
  author: userSchema,
  likes: z.number(),
  liked: z.boolean(),
  replies: z.number(),
  reposts: z.number(),
  reposted: z.boolean(),
  // Mutual follows who liked this post: how many, and the first few.
  friendLikes: z.number().default(0),
  friendLikers: z.array(userSchema).default([]),
  // Normalized topics (#name) in the post or reply.
  topics: z.array(z.string()).default([]),
});
const postSchema = basePostSchema.extend({
  // Topic pages only: the posts above a reply, root first.
  ancestors: z.array(basePostSchema).optional(),
});
const topicCountSchema = z.object({ name: z.string(), count: z.number() });
const pageSchema = z.object({
  posts: z.array(postSchema),
  nextCursor: z.string().nullable(),
  serverNow: z.string(),
});
const postResponseSchema = z.object({
  post: postSchema,
  serverNow: z.string(),
});
const websiteLinkSchema = z.object({
  href: z.string(),
  title: z.string(),
  iconKey: z.string().regex(/^[0-9a-f]{64}$/).optional(),
});
const imagePreviewKeySchema = z.string().regex(/^[0-9a-f]{64}$/);
const pagePreviewSchema = websiteLinkSchema.extend({
  kind: z.literal("website").default("website"),
  description: z.string().optional(),
  siteName: z.string(),
  imageKey: imagePreviewKeySchema.optional(),
});
const websitePreviewSchema = z.union([
  pagePreviewSchema,
  websiteLinkSchema.extend({ kind: z.literal("image"), imageKey: imagePreviewKeySchema }),
]);
const websitePreviewsSchema = z.object({
  links: z.array(websiteLinkSchema).default([]),
  previews: z.array(websitePreviewSchema),
  nextOffset: z.number().int().nonnegative().optional(),
});
export type WebsitePreview = z.infer<typeof websitePreviewSchema>;
export type WebsiteLink = z.infer<typeof websiteLinkSchema>;
const threadSchema = z.object({
  post: postSchema,
  ancestors: z.array(postSchema),
  replies: z.array(postSchema),
  truncated: z.boolean(),
  serverNow: z.string(),
});
const sessionSchema = z.union([
  z.object({ authenticated: z.literal(false) }),
  z.object({
    authenticated: z.literal(true),
    needsOnboarding: z.literal(true),
    user: z.null(),
    avatarUrl: z.string().nullable(),
    suggestedHandle: z.string(),
  }),
  z.object({
    authenticated: z.literal(true),
    needsOnboarding: z.literal(false),
    user: userSchema.extend({
      bannerUrl: z.string().nullable(),
      bannerCrop: bannerCropSchema.nullable(),
    }),
    avatarUrl: z.string().nullable(),
    suggestedHandle: z.string(),
  }),
]);
const profileSchema = z.object({
  profile: userSchema.extend({
    bio: z.string(),
    bannerUrl: z.string().nullable(),
    bannerCrop: bannerCropSchema.nullable(),
    createdAt: z.string(),
    followerCount: z.number().int().nonnegative(),
    followingCount: z.number().int().nonnegative(),
  }),
  isFollowing: z.boolean(),
  isFollowedBy: z.boolean(),
  posts: z.array(postSchema),
  reposts: z.array(postSchema),
  replies: z.array(z.object({ post: postSchema, thread: z.array(postSchema) })),
  serverNow: z.string(),
});
export type Post = z.infer<typeof postSchema>;
export type GifSearchItem = Awaited<
  ReturnType<typeof api.searchGifs>
>["items"][number];
export type TopicCount = z.infer<typeof topicCountSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Profile = z.infer<typeof profileSchema>;
const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(["like", "repost", "reply", "follow", "mention"]),
  actor: userSchema,
  postId: z.string().nullable(),
  preview: z.string().nullable(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export type SocialNotification = z.infer<typeof notificationSchema>;
const notificationsSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number(),
  nextCursor: z.string().nullable(),
});

const traceCodes: Record<string, number> = {
  // auth
  invalid_origin: 1001,
  sign_in_required: 1002,
  onboarding_required: 1003,
  account_deleted: 1004,
  already_onboarded: 1005,
  invalid_login_state: 1006,
  invalid_provider_identity: 1007,
  login_not_configured: 1008,
  provider_unavailable: 1009,
  // post
  post_not_found: 2001,
  not_post_author: 2002,
  edit_window_expired: 2003,
  invalid_content: 2004,
  invalid_post_id: 2005,
  post_id_conflict: 2006,
  invalid_topic: 2007,
  poll_not_found: 2008,
  invalid_poll_option: 2009,
  poll_is_anonymous: 2011,
  // profile
  profile_not_found: 3001,
  invalid_profile: 3002,
  invalid_handle: 3003,
  cannot_follow_self: 3004,
  // paging/inbox/push
  invalid_cursor: 4001,
  invalid_activity_query: 4002,
  invalid_notification_id: 4003,
  invalid_notification_query: 4004,
  invalid_push_mute: 4005,
  push_not_configured: 4006,
  invalid_push_subscription: 4007,
  notification_not_found: 4008,
  push_subscription_not_found: 4009,
  // media
  invalid_avatar: 5001,
  avatar_png_required: 5002,
  avatar_not_found: 5003,
  avatar_storage_not_configured: 5004,
  avatar_storage_unavailable: 5005,
  invalid_banner: 5006,
  invalid_banner_crop: 5007,
  banner_not_found: 5008,
  // gif
  invalid_gif_selection: 6001,
  invalid_search: 6002,
  gif_search_limit: 6003,
  gif_search_unavailable: 6004,
  klipy_not_configured: 6005,
  // api
  route_not_found: 7001,
  unexpected_response: 7002,
};

export class ApiError extends Error {
  readonly status: number;
  /** "METHOD /path" of the failed request, for tracing. */
  readonly endpoint?: string;
  constructor(status: number, message: string, endpoint?: string) {
    super(message);
    this.status = status;
    this.endpoint = endpoint;
  }
  /**
   * Numeric code shown to people next to the message so a report can be traced
   * to the exact cause, e.g. YS-1001. Known API errors have a fixed number
   * (see traceCodes: 1xxx auth, 2xxx posts, 3xxx profiles, 4xxx paging/inbox/
   * push, 5xxx media, 6xxx GIFs, 7xxx API plumbing). Unlisted errors get a
   * stable 9xxx number derived from the API's error text. YS-0001 means the
   * server was never reached.
   */
  get traceCode() {
    if (this.status === 0) return "YS-0001";
    const known = traceCodes[this.message];
    if (known) return `YS-${known}`;
    let hash = 0;
    for (const char of `${this.status}:${this.message}`)
      hash = (hash * 31 + char.charCodeAt(0)) % 1000;
    return `YS-${9000 + hash}`;
  }
}

// Only transport failures are retried. Validation and authorization errors
// still reach the caller so the user can act on them.
export async function retryRequest<T>(
  operation: () => Promise<T>,
  {
    context,
    signal,
    beforeRetry,
  }: {
    context: string;
    signal?: AbortSignal;
    beforeRetry?: () => Promise<void>;
  },
): Promise<T> {
  let attempt = 0;
  let finishRetry: (() => void) | undefined;
  try {
    while (true) {
      signal?.throwIfAborted();
      try {
        if (attempt > 0) await beforeRetry?.();
        return await operation();
      } catch (error) {
        signal?.throwIfAborted();
        if (
          !(error instanceof ApiError) ||
          ![0, 408, 500, 502, 503, 504].includes(error.status)
        )
          throw error;
        finishRetry ??= beginConnectionRetry();
        const delay = Math.min(1000 * 2 ** Math.min(attempt++, 5), 30_000);
        if (import.meta.env.DEV)
          console.debug("[api] Retrying in the background", {
            context,
            attempt,
            delay,
            error,
          });
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => {
            clearTimeout(timer);
            reject(signal?.reason);
          };
          const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
          }, delay);
          signal?.addEventListener("abort", onAbort, { once: true });
        });
      }
    }
  } finally {
    finishRetry?.();
  }
}
function friendlyMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return "Your session expired. Sign in to continue.";
    if (error.message === "onboarding_required")
      return "Choose your handle to continue.";
    if (error.message === "edit_window_expired")
      return "The 15-minute edit window has expired.";
    if (error.message === "profile_not_found")
      return "This profile does not exist.";
    if (error.message === "invalid_profile")
      return "Check your handle, display name, and bio, then try again.";
    if (error.message === "gif_search_limit")
      return "GIF search limit reached. Try again later.";
    if (error.message === "gif_search_unavailable")
      return "GIF search is temporarily unavailable. Try again.";
    if (error.message === "invalid_gif_selection")
      return "This GIF selection expired. Search and select it again.";
    if (error.message === "klipy_not_configured")
      return "GIF search is not configured yet.";
    if (error.message === "invalid_banner")
      return "Choose a JPEG, PNG, AVIF, WebP or GIF under 10 MB. Animated images must have no more than 120 frames.";
    if (error.message === "avatar_storage_not_configured")
      return "Profile picture uploads are not configured yet.";
    if (error.message === "avatar_storage_unavailable")
      return "Picture storage is temporarily unavailable. Please try again.";
    if (
      error.message === "invalid_avatar" ||
      error.message === "avatar_png_required"
    )
      return "This picture could not be saved. Choose another image.";
    if (error.status === 413)
      return "This picture is too large. Choose a smaller image.";
    if (error.message === "post_not_found")
      return "This post no longer exists.";
    if (error.message === "invalid_poll_option")
      return "Choose an option from this poll.";
    if (error.message === "invalid_topic") return "This isn't a valid topic.";
    if (error.message === "retry_account_changed")
      return "Sign in to the original account before retrying this action.";
    if (error.message === "post_id_conflict")
      return "This post was already sent with different content. Reload to view it.";
    if (error.status === 409)
      return error.message === "already_onboarded"
        ? "Your account is already set up. Reload to continue."
        : "That handle is taken. Choose another.";
    if (error.status === 0)
      return "You seem to be offline. Check your connection and try again.";
    if (error.status === 403) return "You don't have permission to do that.";
    if (error.status === 404) return "We couldn't find what you were looking for.";
    if (error.status === 429)
      return "Too many requests. Wait a moment, then try again.";
    if (error.status >= 500)
      return "Something went wrong on our side. Please try again in a moment.";
    return "Something went wrong. Please try again.";
  }
  if (error instanceof z.ZodError)
    return "We got an unexpected answer from the server. Please try again.";
  return "Something went wrong. Please try again.";
}
/** User-facing text for any failure, ending in a trace code developers can search for. */
export function errorMessage(error: unknown) {
  const message = friendlyMessage(error);
  const code =
    error instanceof ApiError
      ? error.traceCode
      : error instanceof z.ZodError
        ? "YS-0002"
        : "YS-0003";
  return `${message} (${code})`;
}
async function sendRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers:
      body === undefined
        ? undefined
        : {
            "Content-Type":
              body instanceof Blob
                ? body.type || "application/octet-stream"
                : "application/json",
          },
    body:
      body === undefined
        ? undefined
        : body instanceof Blob
          ? body
          : JSON.stringify(body),
  }).catch((error: unknown) => {
    signal?.throwIfAborted();
    if (error instanceof TypeError)
      throw new ApiError(0, "network_unavailable");
    throw error;
  });
  if (!response.ok) {
    const parsed = z
      .object({ error: z.string() })
      .safeParse(await response.json().catch(() => null));
    const error = new ApiError(
      response.status,
      // A body that is not our JSON error shape means a proxy or an
      // unexpected route answered, not the API itself.
      parsed.success ? parsed.data.error : "unexpected_response",
      `${method} ${path}`,
    );
    console.error(`[ysocial] ${error.traceCode}`, error.endpoint);
    throw error;
  }
  return schema.parse(
    response.status === 204 ? undefined : await response.json(),
  );
}
function request<T>(
  path: string,
  schema: z.ZodType<T>,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const send = () => sendRequest(path, schema, method, body, signal);
  // GIF search uses POST but is a read. Writes opt in at their owner, where
  // account checks and stable post IDs make replay safe.
  return method === "GET" || path === "/api/banners/gifs/search"
    ? retryRequest(send, { context: `${method} ${path}`, signal })
    : send();
}
const postPath = (id: string) => `/api/posts/${encodeURIComponent(id)}`;
export const api = {
  notifications: (cursor?: string, unread = false, signal?: AbortSignal) =>
    request(
      `/api/notifications?unread=${unread}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      notificationsSchema,
      "GET",
      undefined,
      signal,
    ),
  readNotification: (id: string) =>
    request(
      `/api/notifications/${encodeURIComponent(id)}/read`,
      z.undefined(),
      "PUT",
    ),
  readAllNotifications: (through: string) =>
    request("/api/notifications/read", z.undefined(), "PUT", { through }),
  pushConfig: (endpoint?: string, signal?: AbortSignal) =>
    request(
      `/api/notifications/push${endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ""}`,
      z.object({
        publicKey: z.string().nullable(),
        subscribed: z.boolean(),
        promptDismissed: z.boolean(),
        mutedUntil: z.string().nullable(),
        mutedForever: z.boolean(),
      }),
      "GET",
      undefined,
      signal,
    ),
  subscribePush: (subscription: PushSubscriptionJSON) =>
    request("/api/notifications/push", z.undefined(), "PUT", subscription),
  dismissNotificationPrompt: () =>
    request("/api/notifications/push/prompt-dismissal", z.undefined(), "PUT"),
  mutePush: (endpoint: string, duration: "1h" | "8h" | "forever" | "off") =>
    request(
      "/api/notifications/push/mute",
      z.object({
        mutedUntil: z.string().nullable(),
        mutedForever: z.boolean(),
      }),
      "PATCH",
      { endpoint, duration },
    ),
  unsubscribePush: (endpoint: string) =>
    request("/api/notifications/push", z.undefined(), "DELETE", { endpoint }),
  handleAvailability: (handle: string, signal?: AbortSignal) =>
    request(
      `/api/profiles/${encodeURIComponent(handle)}/availability`,
      z.object({ available: z.boolean() }),
      "GET",
      undefined,
      signal,
    ),
  updateProfile: (
    profile: Partial<
      Pick<Profile["profile"], "handle" | "displayName" | "bio">
    >,
    signal?: AbortSignal,
  ) =>
    request(
      "/api/profiles/me",
      z.object({
        handle: z.string(),
        displayName: z.string(),
        bio: z.string(),
      }),
      "PATCH",
      profile,
      signal,
    ),
  session: (signal?: AbortSignal) =>
    request("/auth/me", sessionSchema, "GET", undefined, signal),
  onboard: (handle: string) =>
    request("/auth/profile", z.object({ user: userSchema }), "POST", {
      handle,
    }),
  searchGifs: (query: string, page = 1, signal?: AbortSignal) =>
    request(
      "/api/banners/gifs/search",
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            previewUrl: z.string(),
            width: z.number().optional(),
            height: z.number().optional(),
            url: z.string(),
            token: z.string(),
          }),
        ),
        hasNext: z.boolean(),
      }),
      "POST",
      { query, page },
      signal,
    ),
  selectBannerGif: (token: string, crop: BannerCrop, signal?: AbortSignal) =>
    request(
      "/api/banners/gifs",
      z.object({ bannerUrl: z.string() }),
      "POST",
      { token, crop },
      signal,
    ),
  uploadBanner: (picture: Blob, crop: BannerCrop, signal?: AbortSignal) =>
    request(
      `/api/banners/me?crop=${encodeURIComponent(JSON.stringify(crop))}`,
      z.object({ bannerUrl: z.string() }),
      "PUT",
      picture,
      signal,
    ),
  removeBanner: (signal?: AbortSignal) =>
    request("/api/banners/me", z.undefined(), "DELETE", undefined, signal),
  uploadAvatar: (picture: Blob, signal?: AbortSignal) =>
    request(
      "/api/avatars/me",
      z.object({ avatarUrl: z.string() }),
      "PUT",
      picture,
      signal,
    ),
  logout: () => request("/auth/logout", z.undefined(), "POST"),
  posts: (cursor?: string, signal?: AbortSignal, topic?: string) => {
    const query = new URLSearchParams();
    if (topic) query.set("topic", topic);
    if (cursor) query.set("cursor", cursor);
    return request(
      `/api/posts${query.size ? `?${query}` : ""}`,
      pageSchema,
      "GET",
      undefined,
      signal,
    );
  },
  /** The most used topics of the last 24 hours. */
  trendingTopics: (signal?: AbortSignal) =>
    request(
      "/api/topics",
      z.object({
        topics: z.array(topicCountSchema),
        windowHours: z.number(),
      }),
      "GET",
      undefined,
      signal,
    ),
  /** Existing topics starting with a prefix, for autocomplete. */
  suggestTopics: (prefix: string, signal?: AbortSignal) =>
    request(
      `/api/topics?prefix=${encodeURIComponent(prefix)}`,
      z.object({ topics: z.array(topicCountSchema) }),
      "GET",
      undefined,
      signal,
    ),
  topic: (name: string, signal?: AbortSignal) =>
    request(
      `/api/topics/${encodeURIComponent(name)}`,
      z.object({ topic: z.object({ name: z.string(), posts: z.number() }) }),
      "GET",
      undefined,
      signal,
    ),
  post: (id: string, signal?: AbortSignal) =>
    request(postPath(id), postResponseSchema, "GET", undefined, signal),
  postPreview: (id: string, signal: AbortSignal) =>
    sendRequest(postPath(id), postResponseSchema, "GET", undefined, signal),
  websitePreviews: (id: string, offset: number, signal: AbortSignal) =>
    sendRequest(
      `${postPath(id)}/link-previews${offset ? `?offset=${offset}` : ""}`,
      websitePreviewsSchema,
      "GET",
      undefined,
      signal,
    ),
  websitePreviewImage: (id: string, key: string) =>
    `${postPath(id)}/link-preview-image/${encodeURIComponent(key)}`,
  websitePreviewIcon: (id: string, key: string) =>
    `${postPath(id)}/link-preview-icon/${encodeURIComponent(key)}`,
  thread: (id: string, signal?: AbortSignal) =>
    request(`${postPath(id)}/thread`, threadSchema, "GET", undefined, signal),
  postEdits: (id: string, signal?: AbortSignal) =>
    request(
      `${postPath(id)}/edits`,
      z.object({
        versions: z.array(z.object({ content: z.string(), at: z.string() })),
      }),
      "GET",
      undefined,
      signal,
    ),
  postActivity: (
    id: string,
    type: "likes" | "reposts" | "voters",
    { cursor, signal, options }: { cursor?: string; signal?: AbortSignal; options?: readonly number[] },
  ) => {
    const params = new URLSearchParams();
    if (type !== "voters") params.set("type", type);
    if (type === "voters") {
      for (const option of options ?? []) params.append("option", String(option));
    }
    if (cursor) params.set("cursor", cursor);
    const path = type === "voters" ? "poll/voters" : "activity";
    return request(
      `${postPath(id)}/${path}${params.size ? `?${params}` : ""}`,
      z.object({
        users: z.array(activityUserSchema),
        nextCursor: z.string().nullable(),
      }),
      "GET",
      undefined,
      signal,
    );
  },
  mentionSuggestions: (query: string, signal?: AbortSignal) =>
    request(
      `/api/profiles/suggestions?q=${encodeURIComponent(query)}`,
      z.object({ users: z.array(userSchema).max(3) }),
      "GET",
      undefined,
      signal,
    ),
  publish: (content: string, clientId?: string, gifToken?: string, poll?: PollDraft) =>
    request("/api/posts", postResponseSchema, "POST", {
      content,
      clientId,
      gifToken,
      poll,
    }),
  replies: (id: string, cursor?: string, signal?: AbortSignal) =>
    request(
      `${postPath(id)}/replies${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      pageSchema,
      "GET",
      undefined,
      signal,
    ),
  reply: (id: string, content: string, clientId?: string, gifToken?: string, poll?: PollDraft) =>
    request(`${postPath(id)}/replies`, postResponseSchema, "POST", {
      content,
      clientId,
      gifToken,
      poll,
    }),
  vote: (id: string, optionIndex: number) =>
    request(`${postPath(id)}/poll/vote`, z.object({ poll: pollSchema }), "PUT", { optionIndex }),
  pollResults: (ids: string[], signal: AbortSignal) =>
    sendRequest(
      `/api/posts/poll-results?ids=${encodeURIComponent(ids.join(","))}`,
      z.object({
        viewerId: z.string().nullable(),
        results: z.array(z.object({ id: z.string(), poll: pollSchema })),
      }),
      "GET",
      undefined,
      signal,
    ),
  like: (id: string, liked: boolean) =>
    request(
      `${postPath(id)}/like`,
      z.object({ likes: z.number(), liked: z.boolean() }),
      liked ? "PUT" : "DELETE",
    ),
  repost: (id: string, reposted: boolean) =>
    request(
      `${postPath(id)}/repost`,
      z.object({ reposts: z.number(), reposted: z.boolean() }),
      reposted ? "PUT" : "DELETE",
    ),
  edit: (id: string, content: string) =>
    request(postPath(id), postResponseSchema, "PATCH", { content }),
  delete: (id: string) => request(postPath(id), z.undefined(), "DELETE"),
  follow: (handle: string, following: boolean) =>
    request(
      `/api/profiles/${encodeURIComponent(handle)}/follow`,
      z.object({
        isFollowing: z.boolean(),
        isFollowedBy: z.boolean(),
        followerCount: z.number().int().nonnegative(),
      }),
      following ? "PUT" : "DELETE",
    ),
  profile: (handle: string, signal?: AbortSignal) =>
    request(
      `/api/profiles/${encodeURIComponent(handle)}`,
      profileSchema,
      "GET",
      undefined,
      signal,
    ),
};
