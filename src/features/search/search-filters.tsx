import { useEffect, useEffectEvent, useState } from "react";
import { ListFilter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  NO_FILTERS,
  filterCount,
  formatFilterDate,
  isFilterUser,
  normalizeFilterUser,
  type SearchFilters,
  type SearchSort,
} from "@/lib/search";
import { cn } from "@/lib/utils";

const USER_DEBOUNCE = 500;

export function FilterMenu({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [userDraft, setUserDraft] = useState(filters.user);
  const [seenUser, setSeenUser] = useState(filters.user);
  if (filters.user !== seenUser) {
    setSeenUser(filters.user);
    setUserDraft(filters.user);
  }
  const [userChecked, setUserChecked] = useState(false);
  const count = filterCount(filters);
  const draftUser = normalizeFilterUser(userDraft);
  const userInvalid = draftUser !== "" && !isFilterUser(draftUser);
  const applyUser = useEffectEvent((user: string) => onChange({ user }));
  useEffect(() => {
    if (draftUser === filters.user || userInvalid) return;
    const timer = window.setTimeout(() => applyUser(draftUser), USER_DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [draftUser, filters.user, userInvalid]);
  function commitUser() {
    setUserChecked(true);
    if (!userInvalid) onChange({ user: draftUser });
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={count ? `Filters, ${count} active` : "Filters"}
                  className={cn(
                    "relative shrink-0",
                    count > 0 && "text-primary",
                  )}
                />
              }
            />
          }
        >
          <ListFilter aria-hidden="true" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground"
            >
              {count}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent>Filters</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 gap-4 p-4">
        <PopoverTitle>Filter posts</PopoverTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-from">From date</Label>
            <Input
              id="filter-from"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => onChange({ from: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-to">To date</Label>
            <Input
              id="filter-to"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => onChange({ to: event.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-user">From user</Label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            >
              @
            </span>
            <Input
              id="filter-user"
              value={userDraft}
              placeholder="username"
              maxLength={33}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={(userChecked && userInvalid) || undefined}
              onChange={(event) => {
                setUserDraft(event.target.value);
                setUserChecked(false);
              }}
              onBlur={commitUser}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                commitUser();
              }}
              className="pl-7"
            />
          </div>
          {userChecked && userInvalid && (
            <p role="alert" className="text-xs text-destructive">
              Usernames have 3 to 32 letters, numbers or underscores.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-sort">Sort by</Label>
          <NativeSelect
            id="filter-sort"
            className="w-full"
            value={filters.sort}
            onChange={(event) =>
              onChange({ sort: event.target.value as SearchSort })
            }
          >
            <NativeSelectOption value="newest">
              Newest to oldest
            </NativeSelectOption>
            <NativeSelectOption value="oldest">
              Oldest to newest
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={count === 0 && !userDraft}
            onClick={() => {
              setUserDraft("");
              onChange(NO_FILTERS);
            }}
          >
            Reset
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FilterChips({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
}) {
  const chips: { key: string; label: string; clear: Partial<SearchFilters> }[] =
    [];
  if (filters.from)
    chips.push({
      key: "from",
      label: `From ${formatFilterDate(filters.from)}`,
      clear: { from: "" },
    });
  if (filters.to)
    chips.push({
      key: "to",
      label: `To ${formatFilterDate(filters.to)}`,
      clear: { to: "" },
    });
  if (filters.user)
    chips.push({
      key: "user",
      label: `@${filters.user}`,
      clear: { user: "" },
    });
  if (filters.sort === "oldest")
    chips.push({
      key: "sort",
      label: "Oldest first",
      clear: { sort: "newest" },
    });
  if (!chips.length) return null;
  return (
    <ul aria-label="Active filters" className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`Remove filter: ${chip.label}`}
                  onClick={() => onChange(chip.clear)}
                  className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border bg-muted/50 pr-1.5 pl-3 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              {chip.label}
              <X aria-hidden="true" className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Remove filter</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
