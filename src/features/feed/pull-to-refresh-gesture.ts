export const REFRESH_DISTANCE = 64;

export type PullState =
  | { kind: "idle" }
  | { kind: "pulling"; distance: number }
  | { kind: "refreshing" };

// Listen on the scroll container so a pull can start anywhere in the feed.
export function attachPullToRefresh({
  container,
  enabled,
  onChange,
  onRefresh,
}: {
  container: HTMLElement;
  enabled: () => boolean;
  onChange: (state: PullState) => void;
  onRefresh: () => Promise<void>;
}) {
  const mobile = window.matchMedia("(width < 48rem) and (pointer: coarse)");
  let gesture: { x: number; y: number; distance: number } | null = null;
  let refreshing = false;
  let disposed = false;

  function cancel() {
    gesture = null;
    if (!refreshing) onChange({ kind: "idle" });
  }

  function start(event: TouchEvent) {
    cancel();
    if (
      refreshing ||
      !mobile.matches ||
      !enabled() ||
      container.scrollTop > 0 ||
      event.touches.length !== 1 ||
      (event.target instanceof Element &&
        event.target.closest(
          "input, textarea, select, [contenteditable], [role=dialog]",
        ))
    )
      return;

    // Leave independently scrollable children to handle their own gestures.
    let target = event.target instanceof Element ? event.target : null;
    while (target && target !== container) {
      if (
        target.scrollHeight > target.clientHeight &&
        /auto|scroll/.test(getComputedStyle(target).overflowY)
      )
        return;
      target = target.parentElement;
    }
    const touch = event.touches[0];
    gesture = { x: touch.clientX, y: touch.clientY, distance: 0 };
  }

  function move(event: TouchEvent) {
    if (!gesture) return;
    if (
      !mobile.matches ||
      !enabled() ||
      event.touches.length !== 1 ||
      container.scrollTop > 0
    ) {
      cancel();
      return;
    }
    const touch = event.touches[0];
    const dy = touch.clientY - gesture.y;
    const dx = Math.abs(touch.clientX - gesture.x);
    if (dy <= 0 || (dx > 8 && dx > dy)) {
      cancel();
      return;
    }
    if (dy < 8) return;
    if (!event.cancelable) {
      cancel();
      return;
    }
    event.preventDefault();
    gesture.distance = Math.min(dy * 0.5, 96);
    onChange({ kind: "pulling", distance: gesture.distance });
  }

  async function end() {
    const distance = gesture?.distance ?? 0;
    gesture = null;
    if (distance < REFRESH_DISTANCE || !mobile.matches || !enabled()) {
      if (!refreshing) onChange({ kind: "idle" });
      return;
    }
    refreshing = true;
    onChange({ kind: "refreshing" });
    try {
      await onRefresh();
    } finally {
      refreshing = false;
      if (!disposed) onChange({ kind: "idle" });
    }
  }

  container.addEventListener("touchstart", start, { passive: true });
  container.addEventListener("touchmove", move, { passive: false });
  container.addEventListener("touchend", end);
  container.addEventListener("touchcancel", cancel);
  mobile.addEventListener("change", cancel);
  return () => {
    disposed = true;
    container.removeEventListener("touchstart", start);
    container.removeEventListener("touchmove", move);
    container.removeEventListener("touchend", end);
    container.removeEventListener("touchcancel", cancel);
    mobile.removeEventListener("change", cancel);
  };
}
