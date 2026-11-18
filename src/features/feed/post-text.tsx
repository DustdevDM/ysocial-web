import { Fragment, useMemo } from "react";
import { Link2 } from "lucide-react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, type Post } from "@/lib/api";
import { splitTopics, topicPath } from "@/lib/topics";
import { ExternalPostLink } from "./external-post-link";
import { MentionText } from "./mention-text";
import { PostEmbed } from "./post-embed";
import { WebsiteEmbed } from "./website-embed";
import { WebsiteIcon } from "./website-icon";
import { usePostLinkDetails } from "./use-post-link-details";
import { firstPostEmbed, isWebsiteLink, splitPostLinks } from "./post-links";

const chipClassName =
  "inline-flex max-w-full items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 align-baseline text-xs font-medium leading-4 text-blue-700 outline-none transition-colors hover:bg-blue-500/20 focus-visible:ring-2 focus-visible:ring-ring dark:text-blue-300";
const chipPlaceholderClassName =
  "inline-flex w-32 max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 align-baseline outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PostText({
  post,
  className,
  previewExternalLinks,
}: {
  post: Post;
  className: string;
  previewExternalLinks: boolean;
}) {
  const parts = useMemo(
    () => splitPostLinks(post.content, import.meta.env.DEV),
    [post.content],
  );
  const embed = firstPostEmbed(parts);
  const { captionRef, details, loading } = usePostLinkDetails(
    post.id,
    parts,
    embed,
    previewExternalLinks,
  );
  const websites = details?.websites;
  const websiteEmbed =
    embed?.kind === "external"
      ? websites?.previews.find(({ href }) => href === embed.href)
      : undefined;

  return (
    <>
      <p
        ref={captionRef}
        data-selectable
        aria-busy={loading || undefined}
        className={className}
      >
        {parts.map((part, index) => {
          if (part.kind === "text")
            return (
              <Fragment key={index}>{renderText(post, part.text)}</Fragment>
            );

          const key = `${index}:${part.href}`;
          const pending =
            loading && (part.kind === "post" || isWebsiteLink(part));
          const chipClass = pending ? chipPlaceholderClassName : chipClassName;
          if (part.kind === "external") {
            const website =
              websites?.links.find(({ href }) => href === part.href) ??
              websites?.previews.find(({ href }) => href === part.href);
            const title = website?.title ?? part.text;
            const iconSrc =
              website?.iconKey &&
              api.websitePreviewIcon(post.id, website.iconKey);
            return (
              <ExternalPostLink
                key={key}
                href={part.href}
                className={chipClass}
              >
                {pending ? (
                  <ChipSkeleton label={part.text} />
                ) : (
                  <>
                    <WebsiteIcon
                      src={
                        iconSrc && details?.images.has(iconSrc)
                          ? iconSrc
                          : undefined
                      }
                    />
                    <bdi className="min-w-0 truncate" title={title}>
                      {title}
                    </bdi>
                  </>
                )}
              </ExternalPostLink>
            );
          }

          const linkedPost =
            part.kind === "post" ? details?.posts.get(part.postId) : undefined;
          return (
            <a key={key} href={part.href} className={chipClass}>
              {pending ? (
                <ChipSkeleton label={part.text} />
              ) : linkedPost ? (
                <PostChipLabel
                  post={linkedPost}
                  showAvatar={Boolean(
                    linkedPost.author.avatarUrl &&
                    details?.images.has(linkedPost.author.avatarUrl),
                  )}
                />
              ) : (
                <>
                  {part.kind === "owned" ? (
                    <WebsiteIcon src="/favicon.png" />
                  ) : (
                    <Link2 aria-hidden="true" className="size-3 shrink-0" />
                  )}
                  <bdi className="min-w-0 truncate" title={part.text}>
                    {part.text}
                  </bdi>
                </>
              )}
            </a>
          );
        })}
      </p>
      {embed && loading && (
        <EmbedSkeleton website={embed.kind === "external"} />
      )}
      {embed?.kind === "post" && details && (
        <div className="mt-2">
          <PostEmbed
            link={embed}
            post={details.posts.get(embed.postId)}
            images={details.images}
          />
        </div>
      )}
      {websiteEmbed && details && (
        <WebsiteEmbed
          key={websiteEmbed.href}
          postId={post.id}
          preview={websiteEmbed}
          images={details.images}
        />
      )}
    </>
  );
}

function ChipSkeleton({ label }: { label: string }) {
  return (
    <>
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        data-slot="link-chip-skeleton"
        className="flex h-4 w-full min-w-0 animate-pulse items-center gap-1 motion-reduce:animate-none"
      >
        <span className="size-3.5 shrink-0 rounded-sm bg-foreground/10" />
        <span className="h-2.5 flex-1 rounded-sm bg-foreground/10" />
      </span>
    </>
  );
}

function EmbedSkeleton({ website }: { website: boolean }) {
  return (
    <div
      role="status"
      data-slot="link-embed-skeleton"
      className={
        website
          ? "mt-3 max-w-[25rem] overflow-hidden rounded-lg border"
          : "mt-2 rounded-xl border"
      }
    >
      <span className="sr-only">Loading link preview…</span>
      <div
        aria-hidden="true"
        className="animate-pulse motion-reduce:animate-none"
      >
        {website && <div className="aspect-[2/1] border-b bg-muted" />}
        <div className="flex gap-2.5 p-3">
          {!website && (
            <div className="size-7 shrink-0 rounded-[30%] bg-muted" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 max-w-full rounded bg-muted" />
            <div className="h-3.5 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PostChipLabel({
  post,
  showAvatar,
}: {
  post: Post;
  showAvatar: boolean;
}) {
  const name = post.author.displayName || `@${post.author.handle}`;
  const summary =
    post.content.trim().replace(/\s+/g, " ") ||
    post.poll?.title ||
    post.gif?.title ||
    "Post";
  return (
    <>
      <Avatar className="size-4">
        {showAvatar && post.author.avatarUrl && (
          <AvatarImage
            src={post.author.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
          />
        )}
        <AvatarFallback className="text-[0.5rem]">
          {name.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <bdi className="min-w-0 truncate" title={`${name} / ${summary}`}>
        <span className="font-semibold">{name}</span>
        {" / "}
        {summary}
      </bdi>
    </>
  );
}

function renderText(post: Post, content: string) {
  return splitTopics(content, post.topics).map((part, index) =>
    part.topic ? (
      <Link
        key={index}
        to={topicPath(part.topic)}
        className="rounded-sm text-blue-600 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring dark:text-blue-400"
      >
        {part.text}
      </Link>
    ) : (
      <Fragment key={index}>
        <MentionText post={{ ...post, content: part.text }} />
      </Fragment>
    ),
  );
}
