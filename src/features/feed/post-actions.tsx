import NumberFlow from "@number-flow/react";
import { Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import { Link } from "react-router";
import { IconButton } from "@/components/ui/icon-button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { countFormat } from "@/lib/count-format";
import type { Post } from "@/lib/api";
import { toast } from "@/components/ui/toast-manager";
import type { FeedState } from "./use-feed";

const actionClass = (extra?: string | false) =>
  cn("gap-1.5 px-2 text-muted-foreground", extra);

export function PostActions({ post, feed }: { post: Post; feed: FeedState }) {
  const optimistic = feed.optimisticPostIds.includes(post.id);
  const disabled = feed.pending.includes(post.id);
  // Signed-out people get an explanation instead of dead, greyed-out buttons.
  function react(action: "like" | "repost", run: () => unknown) {
    if (feed.canPost) return void run();
    toast.add({
      title: feed.authenticated
        ? `Choose a handle to ${action} posts`
        : `Log in to ${action} posts`,
      timeout: 5000,
      actionProps: feed.authenticated
        ? {
            children: "Finish profile",
            onClick: () => location.assign("/onboarding"),
          }
        : { children: "Log in", onClick: () => location.assign("/auth/login") },
    });
  }
  return (
    <div className="-ml-2 mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:gap-3">
      <IconButton
        variant="ghost"
        size="sm"
        className={actionClass(post.liked && "text-red-500 hover:text-red-500")}
        label={post.liked ? "Unlike post" : "Like post"}
        aria-pressed={post.liked}
        disabled={disabled}
        onClick={() => react("like", () => feed.toggleLike(post))}
      >
        <Heart
          key={String(post.liked)}
          className={post.liked ? "animate-[pop_420ms_ease-out]" : undefined}
          fill={post.liked ? "currentColor" : "none"}
        />
        <NumberFlow format={countFormat} value={post.likes} />
      </IconButton>
      <Link
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          actionClass(),
          "gap-1.5",
          optimistic && "pointer-events-none opacity-50",
        )}
        to={`/posts/${post.id}`}
        aria-label={`${post.replies} replies`}
        aria-disabled={optimistic || undefined}
        tabIndex={optimistic ? -1 : undefined}
        onClick={(event) => {
          if (optimistic) event.preventDefault();
        }}
      >
        <MessageCircle className="size-3.5" />
        <NumberFlow format={countFormat} value={post.replies} />
      </Link>
      <IconButton
        variant="ghost"
        size="sm"
        className={actionClass(
          post.reposted && "text-green-500 hover:text-green-500",
        )}
        label={post.reposted ? "Undo repost" : "Repost"}
        aria-pressed={post.reposted}
        disabled={disabled}
        onClick={() => react("repost", () => feed.toggleRepost(post))}
      >
        <Repeat2
          key={String(post.reposted)}
          className={post.reposted ? "animate-[turn_500ms_ease-in-out]" : undefined}
        />
        <NumberFlow format={countFormat} value={post.reposts} />
      </IconButton>
      <IconButton
        variant="ghost"
        size="sm"
        label="Share post"
        className={actionClass()}
        disabled={optimistic}
        onClick={() => void feed.sharePost(post)}
      >
        <Share2 />
      </IconButton>
    </div>
  );
}
