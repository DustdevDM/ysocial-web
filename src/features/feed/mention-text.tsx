import { Fragment } from "react";
import { Link } from "react-router";
import type { Post } from "@/lib/api";

export function MentionText({
  post,
}: {
  post: Pick<Post, "content" | "mentions">;
}) {
  const targets = new Map(
    post.mentions.map((mention) => [mention.username, mention]),
  );
  const matches = post.content.matchAll(
    /(?<![\p{L}\p{N}_@/.])@([a-z0-9_]{3,32})(?![\p{L}\p{N}_])/giu,
  );
  const parts = [];
  let end = 0;
  for (const match of matches) {
    const target = targets.get(match[1].toLowerCase());
    if (!target) continue;
    parts.push(
      <Fragment key={match.index}>
        {post.content.slice(end, match.index)}
        <Link
          to={`/@${target.handle}`}
          className="text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {match[0]}
        </Link>
      </Fragment>,
    );
    end = match.index + match[0].length;
  }
  return (
    <>
      {parts}
      {post.content.slice(end)}
    </>
  );
}
