import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowDown, LoaderCircle } from "lucide-react";
import {
  attachPullToRefresh,
  REFRESH_DISTANCE,
  type PullState,
} from "./pull-to-refresh-gesture";

export function PullToRefresh({
  children,
  disabled,
  onRefresh,
}: {
  children: ReactNode;
  disabled: boolean;
  onRefresh: () => Promise<void>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PullState>({ kind: "idle" });
  const enabled = useEffectEvent(() => !disabled);
  const refresh = useEffectEvent(onRefresh);

  useEffect(() => {
    const container = root.current?.closest<HTMLElement>(".content-scroll");
    if (!container) return;
    return attachPullToRefresh({
      container,
      enabled,
      onChange: setState,
      onRefresh: refresh,
    });
  }, []);

  const distance =
    state.kind === "pulling"
      ? state.distance
      : state.kind === "refreshing"
        ? REFRESH_DISTANCE
        : 0;
  const ready = state.kind === "pulling" && distance >= REFRESH_DISTANCE;
  return (
    <div ref={root} className="relative">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-2 overflow-hidden text-xs text-muted-foreground transition-[height] duration-200 motion-reduce:transition-none md:hidden"
        style={{
          height: distance,
          transitionDuration: state.kind === "pulling" ? "0ms" : undefined,
        }}
      >
        {state.kind === "refreshing" ? (
          <LoaderCircle
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <ArrowDown
            aria-hidden
            className="size-4 transition-transform motion-reduce:transition-none"
            style={{ transform: ready ? "rotate(180deg)" : undefined }}
          />
        )}
        <span>
          {state.kind === "refreshing"
            ? "Refreshing feed"
            : ready
              ? "Release to refresh"
              : distance > 0
                ? "Pull to refresh"
                : ""}
        </span>
      </div>
      <div
        className="transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          transform: distance ? `translateY(${distance}px)` : undefined,
          transitionDuration: state.kind === "pulling" ? "0ms" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
