import { useId, type CSSProperties } from "react";
import { Check, EyeOff, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Poll } from "@/lib/api";
import { cn } from "@/lib/utils";

export function PostPoll({
  poll,
  canVote,
  voting,
  onVote,
}: {
  poll: Poll;
  canVote: boolean;
  voting: boolean;
  onVote: (optionIndex: number) => void;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const total = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const PrivacyIcon = poll.anonymous ? EyeOff : Globe;
  const privacyLabel = poll.anonymous ? "Anonymous voting" : "Public voting";

  return (
    <fieldset
      aria-labelledby={titleId}
      className="mt-3 min-w-0 rounded-xl border border-border px-2.5 pb-2.5 text-sm"
    >
      <legend className="mb-1 max-w-full px-1 font-semibold">
        <span className="inline-flex max-w-full items-start gap-1">
          <Tooltip>
            <TooltipTrigger
              closeOnClick={false}
              render={
                <span
                  role="img"
                  aria-label={privacyLabel}
                  tabIndex={0}
                  className="inline-flex size-5 shrink-0 cursor-default items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              <PrivacyIcon aria-hidden="true" className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{privacyLabel}</TooltipContent>
          </Tooltip>
          <span id={titleId} className="min-w-0 wrap-anywhere">
            {poll.title}
          </span>
        </span>
      </legend>
      <ul className="space-y-1.5">
        {poll.options.map((option, index) => {
          const percent = total ? (option.votes / total) * 100 : 0;
          const fillStyle: CSSProperties & { "--poll-share": string } = {
            "--poll-share": `${percent}%`,
          };
          const voteCount = `${option.votes.toLocaleString()} ${option.votes === 1 ? "vote" : "votes"}`;
          const selected = poll.selectedOption === index;
          const detailsId = `${id}-option-${index}`;
          return (
            <li
              key={index}
              className="relative isolate grid min-h-8 min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-lg bg-muted/60 px-2.5 py-1 text-left leading-5 pointer-coarse:min-h-10"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 -z-10 w-(--poll-share) rounded-lg transition-[width,background-color] duration-500 ease-out starting:w-0 motion-reduce:transition-none",
                  selected ? "bg-primary/20" : "bg-foreground/10",
                )}
                style={fillStyle}
              />
              <span
                aria-hidden="true"
                className="text-xs font-semibold tabular-nums"
                title={voteCount}
              >
                {Math.round(percent)}%
              </span>
              <span
                aria-hidden={canVote || undefined}
                className={cn(
                  "min-w-0 wrap-anywhere",
                  selected && "font-medium",
                )}
              >
                {option.label}
              </span>
              {selected && (
                <Check aria-hidden="true" className="size-3.5 text-primary" />
              )}
              <span id={detailsId} className="sr-only">
                {Math.round(percent)}%, {voteCount}
                {selected && ", your vote"}
              </span>
              {canVote && (
                <button
                  type="button"
                  disabled={voting || selected}
                  aria-label={option.label}
                  aria-describedby={detailsId}
                  title={voteCount}
                  className="absolute inset-0 rounded-lg outline-none transition-shadow enabled:cursor-pointer enabled:hover:ring-1 enabled:hover:ring-inset enabled:hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                  onClick={() => onVote(index)}
                />
              )}
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
        {total.toLocaleString()} {total === 1 ? "vote" : "votes"}
      </p>
    </fieldset>
  );
}
