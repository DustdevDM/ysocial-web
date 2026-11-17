import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, errorMessage, type GifSearchItem } from "@/lib/api";
import { GifGrid } from "./gif-grid";

type Search = { query: string; page: number };
type Results = Awaited<ReturnType<typeof api.searchGifs>>;
type Outcome = { search: Search } & (
  { kind: "results"; results: Results } | { kind: "error"; message: string }
);

export function GifPicker({
  onSelect,
}: {
  onSelect: (gif: GifSearchItem) => void;
}) {
  const searchId = useId();
  const scrollRoot = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ query: "", page: 1 });
  const [outcome, setOutcome] = useState<Outcome>();

  useEffect(() => {
    const controller = new AbortController();
    api
      .searchGifs(search.query, search.page, controller.signal)
      .then((results) => {
        if (!controller.signal.aborted)
          setOutcome({ search, kind: "results", results });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setOutcome({ search, kind: "error", message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [search]);

  const current = outcome?.search === search ? outcome : undefined;
  const results = current?.kind === "results" ? current.results : undefined;

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Choose a GIF</DialogTitle>
      </DialogHeader>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch({ query: query.trim(), page: 1 });
        }}
      >
        <label className="sr-only" htmlFor={searchId}>
          Search KLIPY
        </label>
        <Input
          id={searchId}
          type="search"
          value={query}
          maxLength={100}
          placeholder="Search KLIPY"
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      <div
        ref={scrollRoot}
        className="h-[min(36dvh,20rem)] overflow-y-auto overscroll-contain"
        aria-busy={!current}
      >
        {!current && (
          <p className="p-3 text-muted-foreground" role="status">
            Loading GIFs…
          </p>
        )}
        {current?.kind === "error" && (
          <div className="space-y-2 p-3">
            <p className="text-destructive" role="alert">
              {current.message}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSearch({ ...search })}
            >
              Retry
            </Button>
          </div>
        )}
        {results &&
          (results.items.length ? (
            <GifGrid
              items={results.items}
              scrollRoot={scrollRoot}
              disabled={false}
              onSelect={onSelect}
            />
          ) : (
            <p className="p-3 text-muted-foreground" role="status">
              No GIFs found.
            </p>
          ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <a
          href="https://klipy.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <img
            src="/klipy/powered-by-klipy.svg"
            alt="Powered by KLIPY"
            className="h-5 w-auto"
          />
        </a>
        <div className="flex gap-2">
          {search.page > 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSearch({ ...search, page: search.page - 1 })}
            >
              Previous
            </Button>
          )}
          {results?.hasNext && search.page < 100 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSearch({ ...search, page: search.page + 1 })}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}
