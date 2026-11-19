export const SEARCH_MAX_LENGTH = 100;
const SEARCH_MIN_LENGTH = 2;
const MAX_RECENT = 8;
const RECENT_KEY = "ysocial:recent-searches";

export const SEARCH_TABS = ["all", "posts", "people", "topics"] as const;
export type SearchTab = (typeof SEARCH_TABS)[number];

export function parseSearchTab(value: string | null): SearchTab {
  return SEARCH_TABS.find((tab) => tab === value) ?? "all";
}

export function searchTerm(query: string) {
  return query
    .normalize("NFC")
    .replace(/^[@#\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSearchable(query: string) {
  const term = searchTerm(query);
  return (
    Array.from(term).length >= SEARCH_MIN_LENGTH && /[\p{L}\p{N}_]/u.test(term)
  );
}

export function readRecentSearches(): string[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(RECENT_KEY) ?? "[]",
    );
    return Array.isArray(stored)
      ? stored
          .filter((item): item is string => typeof item === "string")
          .slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(searches: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(searches));
  } catch {
    return;
  }
}

export function rememberSearch(query: string) {
  const text = query.trim().replace(/\s+/g, " ");
  if (!isSearchable(text)) return readRecentSearches();
  const searches = [
    text,
    ...readRecentSearches().filter(
      (item) => item.toLowerCase() !== text.toLowerCase(),
    ),
  ].slice(0, MAX_RECENT);
  writeRecentSearches(searches);
  return searches;
}

export function forgetSearch(query: string) {
  const searches = readRecentSearches().filter((item) => item !== query);
  writeRecentSearches(searches);
  return searches;
}

export function clearRecentSearches() {
  writeRecentSearches([]);
}

export type SearchSort = "newest" | "oldest";
export type SearchFilters = {
  from: string;
  to: string;
  user: string;
  sort: SearchSort;
};
export const NO_FILTERS: SearchFilters = {
  from: "",
  to: "",
  user: "",
  sort: "newest",
};

const HANDLE = /^[a-z0-9_]{3,32}$/;

export function isFilterDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
  );
}

export function normalizeFilterUser(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function isFilterUser(value: string) {
  return HANDLE.test(normalizeFilterUser(value));
}

export function parseFilters(params: URLSearchParams): SearchFilters {
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const user = normalizeFilterUser(params.get("user") ?? "");
  return {
    from: isFilterDate(from) ? from : "",
    to: isFilterDate(to) ? to : "",
    user: HANDLE.test(user) ? user : "",
    sort: params.get("sort") === "oldest" ? "oldest" : "newest",
  };
}

export function writeFilters(params: URLSearchParams, filters: SearchFilters) {
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.user) params.set("user", filters.user);
  if (filters.sort === "oldest") params.set("sort", "oldest");
}

export function filterCount(filters: SearchFilters) {
  return (
    Number(!!filters.from) +
    Number(!!filters.to) +
    Number(!!filters.user) +
    Number(filters.sort === "oldest")
  );
}

export function narrowsPosts(filters: SearchFilters) {
  return !!(filters.from || filters.to || filters.user);
}

export function formatFilterDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export function postSearchQuery(query: string, filters: SearchFilters) {
  const params = new URLSearchParams();
  if (isSearchable(query)) params.set("q", query);
  if (filters.from)
    params.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    params.set("to", end.toISOString());
  }
  if (filters.user) params.set("user", filters.user);
  if (filters.sort === "oldest") params.set("sort", "oldest");
  return params.toString();
}
