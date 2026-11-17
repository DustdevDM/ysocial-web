// Run with Node 22.18+ using: node --test scripts/check-pull-to-refresh.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { attachPullToRefresh } from "../src/features/feed/pull-to-refresh-gesture.ts";

class TestElement extends EventTarget {
  scrollTop = 0;
  closest() { return null; }
}

test("mobile pull-to-refresh gesture lifecycle", async () => {
  const originalWindow = globalThis.window;
  const originalElement = globalThis.Element;
  const media = Object.assign(new EventTarget(), { matches: true });
  globalThis.window = { matchMedia: () => media };
  globalThis.Element = TestElement;
  const container = new TestElement();
  let enabled = true;
  let state;
  let calls = 0;
  let finish;
  const detach = attachPullToRefresh({
    container,
    enabled: () => enabled,
    onChange: (next) => { state = next; },
    onRefresh: () => {
      calls++;
      return new Promise((resolve) => { finish = resolve; });
    },
  });
  function touch(type, x = 0, y = 0, count = 1) {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, "touches", {
      value: Array.from({ length: count }, () => ({ clientX: x, clientY: y })),
    });
    container.dispatchEvent(event);
    return event;
  }
  function pull(distance = 160) {
    touch("touchstart");
    const move = touch("touchmove", 0, distance);
    touch("touchend");
    return move;
  }
  try {
    media.matches = false;
    assert.equal(pull().defaultPrevented, false, "desktop scroll stays native");
    assert.equal(calls, 0);
    media.matches = true;
    container.scrollTop = 20;
    assert.equal(pull().defaultPrevented, false, "only start at the top");
    container.scrollTop = 0;
    enabled = false;
    pull();
    assert.equal(calls, 0, "blocked during another load");
    enabled = true;
    pull(80);
    assert.equal(calls, 0, "short pulls settle without refreshing");
    assert.equal(state.kind, "idle");
    touch("touchstart");
    assert.equal(touch("touchmove", 100, 30).defaultPrevented, false);
    touch("touchend");
    assert.equal(calls, 0, "horizontal swipes do not refresh");
    touch("touchstart");
    touch("touchmove", 0, 180);
    touch("touchcancel");
    touch("touchend");
    assert.equal(calls, 0, "cancelled touches do not refresh");
    touch("touchstart");
    touch("touchmove", 0, 180, 2);
    touch("touchend");
    assert.equal(calls, 0, "multi-touch does not refresh");
    touch("touchstart");
    touch("touchmove", 0, 1000);
    assert.deepEqual(state, { kind: "pulling", distance: 96 }, "pull resistance is bounded");
    touch("touchend");
    assert.equal(calls, 1);
    assert.equal(state.kind, "refreshing");
    pull();
    assert.equal(calls, 1, "only one refresh may run at a time");
    finish();
    await Promise.resolve();
    assert.equal(state.kind, "idle", "completion settles the feed");
    touch("touchstart");
    touch("touchmove", 0, 160);
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    touch("touchend");
    assert.equal(calls, 1, "switching to desktop cancels an active pull");
    media.matches = true;
    detach();
    pull();
    assert.equal(calls, 1, "unmount removes the gesture listeners");
  } finally {
    detach();
    globalThis.window = originalWindow;
    globalThis.Element = originalElement;
  }
});
