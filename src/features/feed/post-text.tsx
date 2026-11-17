import { Fragment } from "react";
import { Link } from "react-router";
import type { Post } from "@/lib/api";
import { splitTopics, topicPath } from "@/lib/topics";
import { MentionText } from "./mention-text";

/**
 * Post text with each of the post's #topics turned into a link to its feed
 * and its @mentions into profile links.
 */
export function PostText({ post }: { post: Post }) {
  return splitTopics(post.content, post.topics).map((part, index) =>
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
