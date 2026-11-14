import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { api } from "@/lib/api";
import { GifPreview } from "./gif-preview";

type Gif = Awaited<ReturnType<typeof api.searchGifs>>["items"][number];
const gap = 8;
const overscan = 200;

export function GifGrid({
  items,
  scrollRoot,
  disabled,
  onSelect,
}: {
  items: Gif[];
  scrollRoot: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  onSelect: (item: Gif) => void;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 320, top: 0 });
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;
    let frame = 0;
    function measure() {
      frame = 0;
      if (!root) return;
      const next = {
        width: root.clientWidth,
        height: root.clientHeight,
        top: root.scrollTop,
      };
      setViewport((current) =>
        current.width === next.width &&
        current.height === next.height &&
        current.top === next.top
          ? current
          : next,
      );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    root.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      root.removeEventListener("scroll", schedule);
    };
  }, [scrollRoot]);

  const columns = viewport.width >= 400 ? 3 : 2;
  const layout = useMemo(() => {
    const width = Math.max(0, (viewport.width - gap * (columns - 1)) / columns);
    const heights = Array<number>(columns).fill(0);
    const tiles = items.map((item, index) => {
      const column = heights.indexOf(Math.min(...heights));
      const top = heights[column];
      const height =
        (Math.max(0, width - 4) * (item.height ?? 165)) / (item.width ?? 220) +
        4;
      heights[column] += height + gap;
      return { item, index, top, left: column * (width + gap), width, height };
    });
    return { tiles, height: Math.max(0, ...heights) };
  }, [items, viewport.width, columns]);

  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    grid.current
      ?.querySelector<HTMLButtonElement>(
        `[data-gif-index="${pendingFocus.current}"]`,
      )
      ?.focus({ preventScroll: true });
    pendingFocus.current = null;
  }, [focusedIndex, layout]);

  return (
    <div
      ref={grid}
      className="relative w-full"
      style={{ height: layout.height, overflowAnchor: "none" }}
      data-gif-count={items.length}
    >
      {viewport.width > 0 &&
        layout.tiles
          .filter(
            (tile) =>
              tile.index === focusedIndex ||
              (tile.top + tile.height >= viewport.top - overscan &&
                tile.top <= viewport.top + viewport.height + overscan),
          )
          .map(({ item, index, top, left, width, height }) => (
            <button
              key={item.id}
              type="button"
              data-gif-index={index}
              aria-label={item.title}
              disabled={disabled}
              onClick={() => onSelect(item)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              onKeyDown={(event) => {
                if (event.altKey || event.ctrlKey || event.metaKey) return;
                let next: number;
                switch (event.key) {
                  case "Tab":
                    next = index + (event.shiftKey ? -1 : 1);
                    break;
                  case "ArrowRight":
                    next = index + 1;
                    break;
                  case "ArrowLeft":
                    next = index - 1;
                    break;
                  case "ArrowDown":
                    next = index + columns;
                    break;
                  case "ArrowUp":
                    next = index - columns;
                    break;
                  case "Home":
                    next = 0;
                    break;
                  case "End":
                    next = items.length - 1;
                    break;
                  default:
                    return;
                }
                if (next < 0 || next >= items.length) return;
                if (next === index) {
                  event.preventDefault();
                  return;
                }
                const tile = layout.tiles[next];
                const root = scrollRoot.current;
                if (!root) return;
                event.preventDefault();
                pendingFocus.current = next;
                setFocusedIndex(next);
                if (tile.top < root.scrollTop) root.scrollTop = tile.top;
                else if (
                  tile.top + tile.height >
                  root.scrollTop + root.clientHeight
                )
                  root.scrollTop = tile.top + tile.height - root.clientHeight;
              }}
              className="absolute overflow-hidden rounded-lg border-2 border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ top, left, width, height, contain: "layout paint" }}
            >
              <GifPreview
                src={item.previewUrl}
                width={item.width}
                height={item.height}
                alt={item.title}
              />
            </button>
          ))}
    </div>
  );
}
