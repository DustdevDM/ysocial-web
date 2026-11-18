import type { Post, RepostContext } from "@/lib/api";

/**
 * What to show as "X reposted" above a post once the viewer's own optimistic
 * actions are applied. `base` is what the server said for this list. With
 * `synthesize`, a post the viewer just reposted shows "You reposted" even
 * before the list is refreshed.
 */
export function projectRepostContext(
  post: Post,
  base: RepostContext | undefined,
  viewer: Post["author"] | null,
  synthesize: boolean,
): RepostContext | null {
  if (!viewer) return base ?? null;
  if (base?.by.id === viewer.id)
    return post.reposted
      ? { ...base, audience: post.repostAudience ?? base.audience }
      : null;
  if (synthesize && post.reposted)
    return {
      by: viewer,
      audience: post.repostAudience ?? "public",
      others: base ? base.others + 1 : 0,
    };
  return base ?? null;
}
