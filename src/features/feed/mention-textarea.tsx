import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

type Suggestion = Awaited<
  ReturnType<typeof api.mentionSuggestions>
>["users"][number];

export function MentionTextarea({
  value,
  onValueChange,
  onChange,
  onKeyDown,
  onSelect,
  onBlur,
  onFocus,
  ref,
  wrapperClassName = "relative",
  ...props
}: Omit<ComponentProps<typeof Textarea>, "value"> & {
  value: string;
  onValueChange: (value: string) => void;
  wrapperClassName?: string;
}) {
  const input = useRef<HTMLTextAreaElement | null>(null);
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const match = value
    .slice(0, caret)
    .match(/(?<![\p{L}\p{N}_@/.])@([a-z0-9_]{1,32})$/iu);
  const query =
    focused &&
    !props.disabled &&
    match &&
    !/[\p{L}\p{N}_]/u.test(value[caret] ?? "")
      ? match[1].toLowerCase()
      : null;
  const token = `${caret}:${value}`;
  const users = query !== null && dismissed !== token ? suggestions : [];
  const selected = Math.min(active, Math.max(0, users.length - 1));

  useEffect(() => {
    if (query === null || dismissed === token) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .mentionSuggestions(query, controller.signal)
        .then((response) => {
          if (controller.signal.aborted) return;
          setSuggestions(response.users);
          setActive(0);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, dismissed, token]);

  function choose(user: Suggestion) {
    const element = input.current;
    if (!element || !match) return;
    const start = caret - match[0].length;
    const replacement = `@${user.handle} `;
    const next = value.slice(0, start) + replacement + value.slice(caret);
    onValueChange(next);
    setDismissed(token);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(
        start + replacement.length,
        start + replacement.length,
      );
      setCaret(start + replacement.length);
    });
  }

  return (
    <div className={wrapperClassName}>
      <Textarea
        {...props}
        value={value}
        ref={(element) => {
          input.current = element;
          if (typeof ref === "function") return ref(element);
          if (ref) ref.current = element;
        }}
        onChange={(event) => {
          setCaret(event.currentTarget.selectionStart);
          onChange?.(event);
        }}
        aria-autocomplete="list"
        aria-controls={users.length ? listId : undefined}
        aria-activedescendant={
          users.length ? `${listId}-${selected}` : undefined
        }
        onSelect={(event) => {
          setCaret(event.currentTarget.selectionStart);
          onSelect?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          setCaret(event.currentTarget.selectionStart);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (users.length && !event.nativeEvent.isComposing) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setActive(
                (selected +
                  (event.key === "ArrowDown" ? 1 : users.length - 1)) %
                  users.length,
              );
              return;
            }
            if (
              (event.key === "Enter" || event.key === "Tab") &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey
            ) {
              event.preventDefault();
              choose(users[selected]);
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setDismissed(token);
              return;
            }
          }
          onKeyDown?.(event);
        }}
      />
      {users.length > 0 && (
        <div
          id={listId}
          role="listbox"
          aria-label="Username suggestions"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {users.map((user, index) => (
            <div
              key={user.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={selected === index}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${selected === index ? "bg-accent text-accent-foreground" : ""}`}
              onPointerDown={(event) => {
                event.preventDefault();
                choose(user);
              }}
              onPointerMove={() => setActive(index)}
            >
              <span className="block font-medium">@{user.handle}</span>
              {user.displayName && (
                <span className="block truncate text-xs text-muted-foreground">
                  {user.displayName}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
