import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Construction, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FeedState } from "./use-feed";

export function PostComposer({
  feed,
  placeholder = "What's on your mind?",
}: {
  feed: FeedState;
  placeholder?: string;
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
  return <AuthenticatedPostComposer feed={feed} placeholder={placeholder} />;
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
}: {
  feed: FeedState;
  placeholder: string;
}) {
  const [published, setPublished] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  // Kept here, not in the feed state: typing must not re-render every post.
  const [draft, setDraft] = useState("");
  const [height, setHeight] = useState<number>();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const length = Array.from(draft.trim()).length;
  const empty = length === 0;
  const valid = feed.canPost && !empty && length <= LIMIT;

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

  useEffect(() => {
    if (!published) return;
    const timer = setTimeout(() => setPublished(false), 2000);
    return () => clearTimeout(timer);
  }, [published]);

  function publish() {
    if (!valid) return;
    if (!feed.publishPost(draft)) return;
    setDraft("");
    textarea.current?.blur();
    setPublished(true);
  }

  const textClass = "py-1.5 text-sm leading-6 md:text-base";
  return (
    <Dialog open={attachmentsOpen} onOpenChange={setAttachmentsOpen}>
      {/* Equal 8px padding above, below and right of the buttons (36px). */}
      <form
        className="mx-auto flex w-full max-w-xl items-end gap-2 rounded-[1.75rem] bg-muted p-2 pl-4 transition-shadow focus-within:ring-1 focus-within:ring-border sm:pl-5"
        aria-label="Post composer"
        onSubmit={(event) => {
          event.preventDefault();
          publish();
        }}
      >
        <div
          className="relative min-w-0 flex-1 transition-[height] duration-200 ease-out"
          style={{ height: height ? Math.min(height, MAX_HEIGHT) : undefined }}
        >
          <div
            ref={mirror}
            aria-hidden="true"
            className={`pointer-events-none invisible absolute inset-x-0 top-0 min-h-9 break-words whitespace-pre-wrap ${textClass}`}
          >
            {draft || " "}
            {"\u200b"}
          </div>
          <Textarea
            ref={textarea}
            aria-label={placeholder.replace("…", "")}
            aria-describedby={helpId}
            placeholder={placeholder}
            rows={1}
            value={draft}
            disabled={!feed.canPost}
            onChange={(event) => {
              setPublished(false);
              setDraft(event.target.value);
            }}
            onKeyDown={(event) => {
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
            style={{
              overflowY: (height ?? 0) > MAX_HEIGHT ? "auto" : "hidden",
            }}
            className={`absolute inset-0 h-full min-h-0 resize-none field-sizing-fixed rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100 dark:bg-transparent dark:disabled:bg-transparent ${textClass}`}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <LimitRing length={length} />
          <DialogTrigger
            render={
              <IconButton
                label="Add attachment"
                type="button"
                className={`rounded-full text-muted-foreground transition-opacity ${empty ? "opacity-50" : ""}`}
              />
            }
          >
            <Plus />
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
      <DialogContent>
        <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Construction className="size-6" aria-hidden="true" />
        </div>
        <DialogHeader>
          <DialogTitle>Attachments are under construction</DialogTitle>
          <DialogDescription>
            We're working on uploads. You can share a text post for now.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>Got it</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
