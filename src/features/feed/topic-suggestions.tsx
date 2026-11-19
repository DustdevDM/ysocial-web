import { useEffect, useState } from "react";
import { api, type TopicCount } from "@/lib/api";
import { cn } from "@/lib/utils";
import { topicQueryAt } from "@/lib/topics";

const DEBOUNCE = 120;

/**
 * Autocomplete for the "#topic" being typed at the caret: existing topics that
 * start with what was typed so far. Typing on past them simply makes a new topic.
 */
export function useTopicSuggestions(
  draft: string,
  caret: number,
  enabled: boolean,
) {
  const query = enabled ? topicQueryAt(draft, caret) : null;
  const prefix = query?.prefix ?? null;
  const [found, setFound] = useState<{
    prefix: string;
    topics: TopicCount[];
  } | null>(null);
  const [highlight, setHighlight] = useState({ prefix: "", index: -1 });
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  // Escape only silences the topic being typed; the next one suggests again.
  if (!query && dismissedAt !== null) setDismissedAt(null);

  useEffect(() => {
    if (!prefix) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .suggestTopics(prefix, controller.signal)
        .then((result) => setFound({ prefix, topics: result.topics }))
        .catch(() => {});
    }, DEBOUNCE);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [prefix]);

  // Results for a shorter prefix still contain the matches for a longer one,
  // so keep showing them while the narrower request is on its way.
  const items =
    prefix && found && prefix.startsWith(found.prefix)
      ? found.topics.filter((topic) => topic.name.startsWith(prefix))
      : [];
  const complete = items.length === 1 && items[0].name === prefix;
  const open =
    !!query && items.length > 0 && !complete && dismissedAt !== query.start;
  const index = highlight.prefix === prefix ? highlight.index : -1;
  return {
    open,
    items,
    index,
    move(step: 1 | -1) {
      const next =
        index === -1
          ? step === 1
            ? 0
            : items.length - 1
          : (index + step + items.length) % items.length;
      setHighlight({ prefix: prefix ?? "", index: next });
    },
    dismiss() {
      if (query) setDismissedAt(query.start);
    },
    /** The draft with the typed "#prefix" completed to a topic. */
    complete(name: string) {
      if (!query) return null;
      const after = draft.slice(query.end);
      const text = `${draft.slice(0, query.start)}#${name}${/^\s/.test(after) ? "" : " "}${after}`;
      return { text, caret: query.start + name.length + 2 };
    },
  };
}
export type TopicSuggestions = ReturnType<typeof useTopicSuggestions>;

export const topicOptionId = (listId: string, index: number) =>
  `${listId}-${index}`;

export function TopicSuggestionList({
  id,
  suggestions,
  dropUp = false,
  onPick,
}: {
  id: string;
  suggestions: TopicSuggestions;
  dropUp?: boolean;
  onPick: (name: string) => void;
}) {
  if (!suggestions.open) return null;
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Topic suggestions"
      className={`absolute inset-x-0 z-20 overflow-hidden rounded-2xl border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 duration-150 ${dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5 slide-in-from-top-1"}`}
    >
      {suggestions.items.map((topic, index) => (
        <li
          key={topic.name}
          id={topicOptionId(id, index)}
          role="option"
          aria-selected={index === suggestions.index}
          // Keep the caret in the text field while picking.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(topic.name)}
          className={cn(
            "flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-sm hover:bg-accent",
            index === suggestions.index && "bg-accent",
          )}
        >
          <span className="min-w-0 truncate">#{topic.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {topic.count.toLocaleString()}{" "}
            {topic.count === 1 ? "post" : "posts"}
          </span>
        </li>
      ))}
    </ul>
  );
}
