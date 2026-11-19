import { useEffect, useId, useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type Recommendations = Awaited<ReturnType<typeof api.pronounRecommendations>>;

export function PronounsField({
  value,
  onChange,
  disabled,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const [recommendations, setRecommendations] = useState<Recommendations>();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void api.pronounRecommendations(controller.signal).then(
      setRecommendations,
      () => {}, // Custom entry stays available if suggestions cannot load.
    );
    return () => controller.abort();
  }, []);

  const languages = recommendations?.languages;
  const locale = new Intl.Locale(navigator.language || "en");
  const browserLanguage = locale.script
    ? `${locale.language}-${locale.script}`
    : locale.language;
  const preferred = [
    ...(languages?.[browserLanguage] ?? languages?.[locale.language] ?? []),
    ...(recommendations?.general ?? []),
  ];
  const query = value.trim().toLocaleLowerCase();
  const suggestions = query
    ? [...new Set([...preferred, ...Object.values(languages ?? {}).flat()])]
    : preferred;
  const matches = suggestions
    .filter((suggestion) => suggestion.toLocaleLowerCase().includes(query))
    .slice(0, 12);
  const open = expanded && !disabled && matches.length > 0;

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium">
        Pronouns
      </label>
      <Autocomplete.Root
        value={value}
        onValueChange={onChange}
        items={suggestions}
        filteredItems={matches}
        open={open}
        onOpenChange={setExpanded}
        openOnInputClick
        disabled={disabled}
      >
        <Autocomplete.Input
          render={<Input />}
          id={id}
          dir="auto"
          maxLength={recommendations?.maxLength ?? 80}
          required={required}
          placeholder="Type your pronouns"
          aria-describedby={`${id}-hint`}
        />
        {open && (
          <Autocomplete.Portal>
            <Autocomplete.Positioner
              sideOffset={4}
              className="z-50 w-(--anchor-width) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
            >
              <Autocomplete.List
                aria-label="Pronoun suggestions"
                className="max-h-[min(12rem,var(--available-height))] overflow-y-auto p-1"
              >
                {(suggestion: string) => (
                  <Autocomplete.Item
                    key={suggestion}
                    value={suggestion}
                    onClick={() => {
                      onChange(suggestion);
                      setExpanded(false);
                    }}
                    className="cursor-default rounded-md px-3 py-1.5 text-sm data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <bdi>{suggestion}</bdi>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        )}
      </Autocomplete.Root>
    </div>
  );
}
