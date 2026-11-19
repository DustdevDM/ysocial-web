import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { loadProfileCard } from "@/features/profile/profile-card-cache";
import { UserHoverCard } from "@/features/profile/user-hover-card";
import type { Post } from "@/lib/api";

export const MENTION_PATTERN =
  /(?<![\p{L}\p{N}_@/.])@([a-z0-9_]{3,32})(?![\p{L}\p{N}_])/giu;

export function findMentions(content: string) {
  return Array.from(content.matchAll(MENTION_PATTERN), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    text: match[0],
    handle: match[1].toLowerCase(),
  }));
}

export function MentionLink({
  handle,
  children,
}: {
  handle: string;
  children: ReactNode;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={350}
        closeDelay={180}
        render={
          <Link
            to={`/@${handle}`}
            className="mention"
            onClick={(event) => event.stopPropagation()}
            onPointerEnter={() => void loadProfileCard(handle).catch(() => {})}
            onFocus={() => void loadProfileCard(handle).catch(() => {})}
          />
        }
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl bg-popover/95 p-0 shadow-xl ring-1 ring-foreground/10 backdrop-blur-xl"
      >
        <UserHoverCard handle={handle} />
      </HoverCardContent>
    </HoverCard>
  );
}

export function MentionText({
  post,
}: {
  post: Pick<Post, "content" | "mentions">;
}) {
  const targets = new Map(
    post.mentions.map((mention) => [mention.username, mention]),
  );
  const parts = [];
  let end = 0;
  for (const match of findMentions(post.content)) {
    const target = targets.get(match.handle);
    if (!target) continue;
    parts.push(
      <Fragment key={match.start}>
        {post.content.slice(end, match.start)}
        <MentionLink handle={target.handle}>{match.text}</MentionLink>
      </Fragment>,
    );
    end = match.end;
  }
  return (
    <>
      {parts}
      {post.content.slice(end)}
    </>
  );
}
