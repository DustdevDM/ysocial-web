import { formatDistance } from "date-fns";
import { ChartNoAxesColumn, Quote } from "lucide-react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PostQuote } from "@/lib/api";

/**
 * The post a quote embeds: author, text, GIF and a poll hint. It opens the
 * original unless `interactive` is off (inside the quote dialog).
 */
export function QuotedPostCard({
  quote,
  interactive = true,
  className,
}: {
  quote: PostQuote;
  interactive?: boolean;
  className?: string;
}) {
  if (quote.state === "unavailable") {
    return (
      <div
        className={cn(
          "mt-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground",
          className,
        )}
      >
        This post was deleted.
      </div>
    );
  }
  const post = quote.post;
  const classes = cn(
    "mt-2 block min-w-0 rounded-xl border p-3 text-left outline-none transition-colors",
    interactive && "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
    className,
  );
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Avatar className="size-5 shrink-0" aria-hidden="true">
          {post.author.avatarUrl && (
            <AvatarImage src={post.author.avatarUrl} alt="" referrerPolicy="no-referrer" />
          )}
          <AvatarFallback className="text-[9px]">
            {(post.author.displayName || post.author.handle).slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-semibold">{post.author.displayName}</span>
        <span className="truncate text-xs text-muted-foreground">@{post.author.handle}</span>
        <time
          dateTime={post.createdAt}
          className="shrink-0 text-xs text-muted-foreground"
          title={new Date(post.createdAt).toLocaleString()}
        >
          {formatDistance(new Date(post.createdAt), new Date(), { addSuffix: true })}
        </time>
      </div>
      {post.content && (
        <p className="mt-1.5 line-clamp-6 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {post.content}
        </p>
      )}
      {post.gif && (
        <img
          src={post.gif.url}
          alt={post.gif.title}
          loading="lazy"
          decoding="async"
          className="mt-2 max-h-48 w-auto max-w-full rounded-lg object-contain"
        />
      )}
      {post.pollTitle && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ChartNoAxesColumn className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Poll: {post.pollTitle}</span>
        </p>
      )}
      {post.isQuote && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Quote className="size-3.5 shrink-0" aria-hidden="true" />
          Quotes another post
        </p>
      )}
    </>
  );
  return interactive ? (
    <Link to={`/posts/${post.id}`} className={classes} aria-label={`Quoted post by ${post.author.displayName}`}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
