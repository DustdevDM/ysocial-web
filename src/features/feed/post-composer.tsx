import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { MentionTextarea } from "./mention-textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FeedState } from "./use-feed";
import { GifPicker } from "@/features/gifs/gif-picker";
import type { GifSearchItem } from "@/lib/api";
import { splitWrittenTopics } from "@/lib/topics";
import {
  TopicSuggestionList,
  topicOptionId,
  useTopicSuggestions,
} from "./topic-suggestions";

export function PostComposer({
  feed,
  placeholder = "What's on your mind?",
  topics = true,
}: {
  feed: FeedState;
  placeholder?: string;
  /** Offer #topic completion. */
  topics?: boolean;
}) {
  if (!feed.sessionLoading && !feed.authenticated) {
    return (
      <Dialog>
        <DialogTrigger
          render={
            <button
              type="button"
              className="mx-auto block w-full max-w-xl rounded-[1.75rem] bg-muted px-4 py-4 text-left text-sm leading-5 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring sm:px-5 md:text-base md:leading-6"
            />
          }
        >
          {placeholder}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log in to post</DialogTitle>
            <DialogDescription>
              Sign in with CNS to share what's on your mind.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button render={<a href="/auth/login" />}>Log in with CNS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <AuthenticatedPostComposer
      feed={feed}
      placeholder={placeholder}
      topics={topics}
    />
  );
}

const LIMIT = 2000;
// The ring only shows up once the end is in sight.
const RING_FROM = 1600;
const MAX_HEIGHT = 240;

/** A small ring that fills and shifts from yellow to red as the limit nears. */
function LimitRing({ length }: { length: number }) {
  const progress = Math.min(
    1,
    Math.max(0, (length - RING_FROM) / (LIMIT - RING_FROM)),
  );
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const hue = 95 - 70 * progress;
  const visible = length >= RING_FROM;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={`flex size-6 shrink-0 items-center justify-center transition-opacity duration-200 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          />
        }
      >
        <svg
          viewBox="0 0 20 20"
          className="size-5 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            strokeWidth="2.5"
            className="stroke-foreground/15"
          />
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ stroke: `oklch(0.8 0.19 ${hue})` }}
            className="transition-[stroke-dashoffset,stroke] duration-150"
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent>
        {length.toLocaleString()} / {LIMIT.toLocaleString()}
      </TooltipContent>
    </Tooltip>
  );
}

function AuthenticatedPostComposer({
  feed,
  placeholder,
  topics,
}: {
  feed: FeedState;
  placeholder: string;
  topics: boolean;
}) {
  const [published, setPublished] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gif, setGif] = useState<GifSearchItem | null>(null);
  // Kept here, not in the feed state: typing must not re-render every post.
  const [draft, setDraft] = useState("");
  const [height, setHeight] = useState<number>();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const highlight = useRef<HTMLDivElement>(null);
  const scrolls = (height ?? 0) > MAX_HEIGHT;
  const helpId = useId();
  const suggestionsId = useId();
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const pendingCaret = useRef<number | null>(null);
  const suggestions = useTopicSuggestions(
    draft,
    caret,
    topics && focused && feed.canPost,
  );
  const length = Array.from(draft.trim()).length;
  const valid = feed.canPost && (length > 0 || gif !== null) && length <= LIMIT;

  // A hidden copy of the text measures how tall the field needs to be, so the
  // visible one can animate between heights (field-sizing cannot transition).
  useLayoutEffect(() => {
    const copy = mirror.current;
    if (!copy) return;
    const update = () => setHeight(copy.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(copy);
    return () => observer.disconnect();
  }, []);

  // After a completion rewrites the text, put the caret behind the topic.
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    textarea.current?.setSelectionRange(
      pendingCaret.current,
      pendingCaret.current,
    );
    pendingCaret.current = null;
  }, [draft]);

  useEffect(() => {
    if (!published) return;
    const timer = setTimeout(() => setPublished(false), 2000);
    return () => clearTimeout(timer);
  }, [published]);

  function pickTopic(name: string) {
    const completed = suggestions.complete(name);
    if (!completed) return;
    pendingCaret.current = completed.caret;
    setCaret(completed.caret);
    setDraft(completed.text);
    textarea.current?.focus();
  }

  function publish() {
    if (!valid) return;
    if (!feed.publishPost(draft, gif)) return;
    setDraft("");
    setGif(null);
    textarea.current?.blur();
    setPublished(true);
  }

  const textClass = "py-1.5 text-sm leading-6 md:text-base";
  return (
    <Dialog open={gifPickerOpen} onOpenChange={setGifPickerOpen}>
      {/* Equal 8px padding above, below and right of the buttons (36px). */}
      <div className="relative mx-auto w-full max-w-xl">
        <form
          className="flex w-full flex-wrap items-end gap-2 rounded-[1.75rem] bg-muted p-2 pl-4 transition-shadow focus-within:ring-1 focus-within:ring-border sm:pl-5"
          aria-label="Post composer"
          onSubmit={(event) => {
            event.preventDefault();
            publish();
          }}
        >
          {gif && (
            <div className="w-full pt-2">
              <div className="relative w-fit max-w-full">
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  className="max-h-40 max-w-full rounded-xl"
                />
                <IconButton
                  label="Remove GIF"
                  type="button"
                  size="icon-sm"
                  className="absolute top-1 right-1 rounded-full bg-background"
                  onClick={() => {
                    setGif(null);
                    textarea.current?.focus();
                  }}
                >
                  <X />
                </IconButton>
              </div>
            </div>
          )}
          <div
            className="relative min-w-0 flex-1 transition-[height] duration-200 ease-out"
            style={{
              height: height ? Math.min(height, MAX_HEIGHT) : undefined,
            }}
          >
            <div
              ref={mirror}
              aria-hidden="true"
              className={`pointer-events-none invisible absolute inset-x-0 top-0 min-h-9 break-words whitespace-pre-wrap ${textClass}`}
            >
              {draft || " "}
              {"\u200b"}
            </div>
            {topics && (
              // Draws the text under the see-through textarea, so written
              // #topics can be blue. Same box, font and scroll as the field.
              <div
                ref={highlight}
                aria-hidden="true"
                style={{ overflowY: scrolls ? "auto" : "hidden" }}
                className={`pointer-events-none absolute inset-0 break-words whitespace-pre-wrap ${textClass}`}
              >
                {splitWrittenTopics(draft).map((part, index) =>
                  part.topic ? (
                    <span
                      key={index}
                      className="text-blue-600 dark:text-blue-400"
                    >
                      {part.text}
                    </span>
                  ) : (
                    part.text
                  ),
                )}
                {"\u200b"}
              </div>
            )}
            <MentionTextarea
              ref={textarea}
              aria-label={placeholder.replace("…", "")}
              aria-describedby={helpId}
              aria-controls={suggestions.open ? suggestionsId : undefined}
              aria-activedescendant={
                suggestions.open && suggestions.index >= 0
                  ? topicOptionId(suggestionsId, suggestions.index)
                  : undefined
              }
              placeholder={placeholder}
              rows={1}
              value={draft}
              onValueChange={setDraft}
              wrapperClassName="relative h-full"
              disabled={!feed.canPost}
              onChange={(event) => {
                setPublished(false);
                setDraft(event.target.value);
                setCaret(event.target.selectionStart);
              }}
              onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onScroll={(event) => {
                if (highlight.current)
                  highlight.current.scrollTop = event.currentTarget.scrollTop;
              }}
              onKeyDown={(event) => {
                if (suggestions.open && !event.nativeEvent.isComposing) {
                  const chosen =
                    suggestions.items[Math.max(suggestions.index, 0)];
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    suggestions.move(event.key === "ArrowDown" ? 1 : -1);
                    return;
                  }
                  if (
                    (event.key === "Tab" && !event.shiftKey) ||
                    (event.key === "Enter" &&
                      !event.ctrlKey &&
                      !event.metaKey &&
                      !event.shiftKey &&
                      suggestions.index >= 0)
                  ) {
                    event.preventDefault();
                    pickTopic(chosen.name);
                    return;
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    suggestions.dismiss();
                    return;
                  }
                }
                if (
                  event.key === "Enter" &&
                  (event.ctrlKey || event.metaKey) &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  if (!event.repeat) publish();
                }
                if (event.key === "Escape" && !draft) {
                  event.currentTarget.blur();
                }
              }}
              style={{ overflowY: scrolls ? "auto" : "hidden" }}
              className={`${topics ? "text-transparent caret-foreground " : ""}absolute inset-0 h-full min-h-0 resize-none field-sizing-fixed rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100 dark:bg-transparent dark:disabled:bg-transparent ${textClass}`}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <LimitRing length={length} />
            <DialogTrigger
              render={
                <IconButton
                  label={gif ? "Change GIF" : "Add GIF"}
                  type="button"
                  disabled={!feed.canPost}
                  className="rounded-full text-muted-foreground"
                />
              }
            >
              <span className="text-[10px] font-semibold">GIF</span>
            </DialogTrigger>
            <IconButton
              label="Publish post"
              type="submit"
              variant="default"
              className="rounded-full"
              disabled={!valid}
            >
              <ArrowUp />
            </IconButton>
          </div>
          <p id={helpId} className="sr-only">
            {feed.canPost
              ? "Enter adds a new line. Press Ctrl+Enter or Command+Enter to post. Maximum 2000 characters."
              : "Sign in and complete your profile to post or reply."}
            {length >= RING_FROM &&
              ` ${LIMIT - length >= 0 ? `${LIMIT - length} characters left.` : `${length - LIMIT} characters over the limit.`}`}
          </p>
          <p role="status" className="sr-only">
            {published ? "Post added" : ""}
          </p>
        </form>
        <TopicSuggestionList
          id={suggestionsId}
          suggestions={suggestions}
          onPick={pickTopic}
        />
        <p role="status" className="sr-only">
          {suggestions.open
            ? `${suggestions.items.length} topic suggestions. Use the arrow keys to choose and Tab to insert.`
            : ""}
        </p>
      </div>
      {gifPickerOpen && (
        <GifPicker
          onSelect={(item) => {
            setGif(item);
            setGifPickerOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}
