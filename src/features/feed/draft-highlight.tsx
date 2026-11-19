import { Fragment, useMemo, type ReactNode } from "react";
import {
  handleExists,
  useExistingHandles,
} from "@/features/profile/profile-card-cache";
import { splitWrittenTopics } from "@/lib/topics";
import { findMentions } from "./mention-text";

const MAX_CHECKED = 8;

export function DraftHighlight({
  text,
  topics,
}: {
  text: string;
  topics: boolean;
}) {
  const handles = useMemo(
    () =>
      text.includes("@")
        ? [
            ...new Set(findMentions(text).map((mention) => mention.handle)),
          ].slice(0, MAX_CHECKED)
        : [],
    [text],
  );
  const known = useExistingHandles(handles);
  const segments = topics
    ? splitWrittenTopics(text)
    : [{ text, topic: undefined as string | undefined }];
  return (
    <>
      {segments.map((segment, index) =>
        segment.topic ? (
          <span key={index} className="text-blue-600 dark:text-blue-400">
            {segment.text}
          </span>
        ) : (
          <Fragment key={index}>
            {withMentions(
              segment.text,
              (handle) => known.has(handle) || handleExists(handle),
            )}
          </Fragment>
        ),
      )}
      {"​"}
    </>
  );
}

function withMentions(text: string, exists: (handle: string) => boolean) {
  if (!text.includes("@")) return text;
  const out: ReactNode[] = [];
  let end = 0;
  for (const mention of findMentions(text)) {
    if (!exists(mention.handle)) continue;
    out.push(
      text.slice(end, mention.start),
      <span key={mention.start} className="mention-draft">
        {mention.text}
      </span>,
    );
    end = mention.end;
  }
  out.push(text.slice(end));
  return out;
}
