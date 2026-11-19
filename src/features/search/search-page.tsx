import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "react-router";
import { Clock, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Session } from "@/lib/api";
import {
  SEARCH_MAX_LENGTH,
  clearRecentSearches,
  forgetSearch,
  isSearchable,
  narrowsPosts,
  parseFilters,
  parseSearchTab,
  postSearchQuery,
  readRecentSearches,
  rememberSearch,
  writeFilters,
  type SearchFilters,
  type SearchTab,
} from "@/lib/search";
import { FilterChips, FilterMenu } from "./search-filters";
import { PeopleResults, PostResults, TopicResults } from "./search-results";

const DEBOUNCE = 250;
const TAB_LABELS: Record<SearchTab, string> = {
  all: "All",
  posts: "Posts",
  people: "People",
  topics: "Topics",
};

function searchParams(query: string, tab: SearchTab, filters: SearchFilters) {
  const next = new URLSearchParams();
  if (query) next.set("q", query);
  if (tab !== "all") next.set("tab", tab);
  writeFilters(next, filters);
  return next;
}

export function SearchPage({ session }: { session: Session | null }) {
  const [params, setParams] = useSearchParams();
  const urlQuery = (params.get("q") ?? "").slice(0, SEARCH_MAX_LENGTH);
  const filters = useMemo(() => parseFilters(params), [params]);
  const [text, setText] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  const [written, setWritten] = useState(urlQuery);
  const [recent, setRecent] = useState(readRecentSearches);
  const input = useRef<HTMLInputElement>(null);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== written) setText(urlQuery);
  }
  const query = urlQuery.trim();
  const textSearchable = isSearchable(query);
  const searching = textSearchable || narrowsPosts(filters);
  const tab = textSearchable ? parseSearchTab(params.get("tab")) : "all";
  const showsPosts = tab === "all" || tab === "posts";
  usePageTitle(textSearchable ? `Search: ${query}` : "Search");

  const commit = useCallback(
    (value: string, nextTab: SearchTab, nextFilters: SearchFilters) => {
      const trimmed = value.trim();
      setWritten(trimmed);
      setParams(searchParams(trimmed, nextTab, nextFilters), { replace: true });
    },
    [setParams],
  );
  useEffect(() => {
    if (text.trim() === urlQuery) return;
    const timer = window.setTimeout(() => commit(text, tab, filters), DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [text, urlQuery, tab, filters, commit]);

  function submit(event: FormEvent) {
    event.preventDefault();
    commit(text, tab, filters);
    setRecent(rememberSearch(text));
  }
  function open() {
    setRecent(rememberSearch(query));
  }
  function searchFor(value: string) {
    setText(value);
    commit(value, tab, filters);
    setRecent(rememberSearch(value));
    input.current?.focus();
  }
  function patchFilters(patch: Partial<SearchFilters>) {
    const current = new URLSearchParams(window.location.search);
    commit(
      (current.get("q") ?? "").slice(0, SEARCH_MAX_LENGTH),
      parseSearchTab(current.get("tab")),
      { ...parseFilters(current), ...patch },
    );
  }
  function clear() {
    setText("");
    commit("", "all", filters);
    input.current?.focus();
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-xl">
        <form role="search" onSubmit={submit} className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={input}
            type="search"
            name="q"
            data-search-input
            aria-label="Search ysocial"
            placeholder="Search people, posts and #topics"
            value={text}
            maxLength={SEARCH_MAX_LENGTH}
            autoFocus={!urlQuery}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              if (text) {
                event.preventDefault();
                clear();
              } else event.currentTarget.blur();
            }}
            className={cn(
              "h-11 rounded-xl pl-9 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none",
              showsPosts
                ? text
                  ? "pr-[4.75rem]"
                  : "pr-11"
                : text
                  ? "pr-10"
                  : "pr-3",
            )}
          />
          <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center">
            {text && (
              <IconButton
                label="Clear search"
                type="button"
                size="icon-sm"
                onClick={clear}
              >
                <X />
              </IconButton>
            )}
            {showsPosts && (
              <FilterMenu filters={filters} onChange={patchFilters} />
            )}
          </div>
        </form>
        {showsPosts && (
          <FilterChips filters={filters} onChange={patchFilters} />
        )}
        {textSearchable && (
          <Tabs
            value={tab}
            onValueChange={(next) =>
              commit(query, parseSearchTab(next), filters)
            }
            className="mt-3"
          >
            <TabsList className="w-full">
              {Object.entries(TAB_LABELS).map(([value, label]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>
      {!searching && (
        <SearchStart
          typed={query.length > 0}
          recent={recent}
          onPick={searchFor}
          onForget={(value) => setRecent(forgetSearch(value))}
          onClear={() => {
            clearRecentSearches();
            setRecent([]);
          }}
        />
      )}
      {searching && showsPosts && (
        <PostResults
          key={`${tab}|${query}|${postSearchQuery(query, filters)}`}
          query={query}
          search={postSearchQuery(query, filters)}
          session={session}
          withPreview={tab === "all" && textSearchable}
          onOpen={open}
          onSeeAllPeople={() => commit(query, "people", filters)}
          onSeeAllTopics={() => commit(query, "topics", filters)}
        />
      )}
      {searching && tab === "people" && (
        <PeopleResults key={query} query={query} onOpen={open} />
      )}
      {searching && tab === "topics" && (
        <TopicResults key={query} query={query} onOpen={open} />
      )}
    </div>
  );
}

function SearchStart({
  typed,
  recent,
  onPick,
  onForget,
  onClear,
}: {
  typed: boolean;
  recent: string[];
  onPick: (query: string) => void;
  onForget: (query: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="mx-auto mt-6 w-full max-w-xl space-y-8">
      <p role="status" className="px-1 text-sm text-muted-foreground">
        {typed
          ? "Keep typing to search."
          : "Find people with @name, topics with #name, or search the words in posts. Use the filter button to narrow posts by date or user."}
      </p>
      {recent.length > 0 && (
        <section aria-labelledby="recent-searches-heading">
          <div className="flex items-center justify-between">
            <h2
              id="recent-searches-heading"
              className="text-base font-semibold"
            >
              Recent searches
            </h2>
            <Button variant="ghost" size="xs" onClick={onClear}>
              Clear all
            </Button>
          </div>
          <ul className="mt-2">
            {recent.map((query) => (
              <li key={query} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPick(query)}
                  className="flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Clock
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 truncate">{query}</span>
                </button>
                <IconButton
                  label={`Remove ${query} from recent searches`}
                  size="icon-sm"
                  onClick={() => onForget(query)}
                >
                  <X />
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
