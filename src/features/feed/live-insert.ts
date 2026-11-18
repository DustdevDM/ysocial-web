import { flushSync } from "react-dom";

const SCROLL_IDLE_MS = 400;
const POLL_MS = 250;
const MAX_WAIT_MS = 10_000;
const TOP_TOLERANCE = 1;

let lastScrollAt = 0;
let pointerDown = false;

if (typeof document !== "undefined") {
  document.addEventListener(
    "scroll",
    () => {
      lastScrollAt = performance.now();
    },
    { capture: true, passive: true },
  );
  document.addEventListener("pointerdown", () => (pointerDown = true), true);
  for (const type of ["pointerup", "pointercancel"])
    document.addEventListener(type, () => (pointerDown = false), true);
  window.addEventListener("blur", () => (pointerDown = false));
}

function isCalm() {
  if (pointerDown || performance.now() - lastScrollAt < SCROLL_IDLE_MS)
    return false;
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) return false;
  return !document.querySelector(
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
  );
}

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const done = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = window.setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

function middleAnchor(scroller: HTMLElement) {
  const bounds = scroller.getBoundingClientRect();
  const middle = bounds.top + bounds.height / 2;
  let nearest: { element: HTMLElement; distance: number } | undefined;
  for (const element of scroller.querySelectorAll<HTMLElement>(
    "article[id^='post-']",
  )) {
    const rect = element.getBoundingClientRect();
    const distance =
      rect.top <= middle && rect.bottom >= middle
        ? 0
        : Math.min(Math.abs(rect.top - middle), Math.abs(rect.bottom - middle));
    if (!nearest || distance < nearest.distance) nearest = { element, distance };
  }
  return nearest?.element;
}

/**
 * Applies a change that adds content to a list, once the reader is not busy.
 * Content that lands above what they are reading never moves it. With `followTop`,
 * a reader resting at the very top sees new content arrive there instead.
 */
export async function applyLive(
  signal: AbortSignal,
  apply: (atTop: boolean) => void,
  { followTop = false } = {},
) {
  const giveUpAt = performance.now() + MAX_WAIT_MS;
  while (!signal.aborted) {
    if (!document.hidden && (isCalm() || performance.now() >= giveUpAt)) break;
    await pause(POLL_MS, signal);
  }
  if (signal.aborted) return;
  const scroller = document.querySelector<HTMLElement>(".content-scroll");
  const atTop = !scroller || scroller.scrollTop <= TOP_TOLERANCE;
  if (!scroller || (followTop && atTop)) {
    apply(atTop);
    return;
  }
  const anchor = middleAnchor(scroller);
  const before = anchor?.getBoundingClientRect().top;
  flushSync(() => apply(false));
  if (anchor?.isConnected && before !== undefined)
    scroller.scrollTop += anchor.getBoundingClientRect().top - before;
}
