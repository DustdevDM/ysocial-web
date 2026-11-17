import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import {
  buildEmojiIndex,
  emojiOnlyCount,
  findEmojis,
  findShortcodes,
  renderShortcodes,
  searchEmojis,
  shortcodeQueryAt,
  toShortcodes,
} from "../src/lib/emoji.ts";

const rows = createRequire(import.meta.url)("../src/lib/emoji-data.json");
const index = buildEmojiIndex(rows);

test("renders known shortcodes and leaves the rest", () => {
  assert.equal(renderShortcodes("I :heart: it", index), "I ❤️ it");
  assert.equal(renderShortcodes(":HEART:", index), "❤️");
  assert.equal(renderShortcodes(":nope: :heart:", index), ":nope: ❤️");
  assert.equal(renderShortcodes("a:qqqq:heart:", index), "a:qqqq❤️");
  assert.equal(renderShortcodes(":heart::fire:", index), "❤️🔥");
  assert.equal(renderShortcodes("10:30:45", index), "10:30:45");
  assert.equal(renderShortcodes(":+1: :thumbsup:", index), "👍 👍");
  assert.equal(renderShortcodes("no colons", index), "no colons");
});

test("writes emojis back as shortcodes and round trips", () => {
  const text = "love ❤️ and 👍 and 🇩🇪 and 👨‍👩‍👧‍👦 ok";
  const plain = toShortcodes(text, index);
  assert.match(plain, /:heart:/);
  assert.match(plain, /:thumbsup:/);
  assert.match(plain, /:de:/);
  assert.equal(renderShortcodes(plain, index), text);
  assert.equal(toShortcodes("plain © text", index), "plain © text");
});

test("finds emoji and shortcode spans with offsets", () => {
  const text = "a❤️b";
  assert.deepEqual(
    findEmojis(text, index).map(({ start, end }) => [start, end]),
    [[1, 3]],
  );
  const spans = findShortcodes("a :heart: b", index);
  assert.deepEqual(
    spans.map(({ start, end, name }) => [start, end, name]),
    [[2, 9, "heart"]],
  );
});

test("detects the shortcode being typed", () => {
  assert.deepEqual(shortcodeQueryAt("hi :he", 6), { start: 3, end: 6, query: "he" });
  assert.equal(shortcodeQueryAt("hi :h", 5), null);
  assert.equal(shortcodeQueryAt("10:30", 5), null);
  assert.equal(shortcodeQueryAt("hi :heart:", 10), null);
  assert.equal(shortcodeQueryAt("hi :hear", 5), null);
  assert.deepEqual(shortcodeQueryAt("hi :he:", 6), { start: 3, end: 7, query: "he" });
});

test("searches by name, alias and keyword", () => {
  assert.equal(searchEmojis(index, "heart")[0].name, "heart");
  assert.equal(searchEmojis(index, "thumbsu")[0].emoji, "👍");
  assert.equal(searchEmojis(index, "+1")[0].emoji, "👍");
  assert.ok(searchEmojis(index, "love").length > 0);
  assert.ok(searchEmojis(index, "heart").length > 8);
  assert.ok(searchEmojis(index, "heart").length <= 40);
  assert.deepEqual(searchEmojis(index, "zzzzqq"), []);
});

test("counts emoji-only text and rejects anything else", () => {
  assert.equal(emojiOnlyCount("❤️"), 1);
  assert.equal(emojiOnlyCount("  🔥 🔥\n🎉  "), 3);
  assert.equal(emojiOnlyCount("👨‍👩‍👧‍👦🇩🇪👍🏽❤️‍🔥1️⃣🏳️‍🌈"), 6);
  assert.equal(emojiOnlyCount("hi ❤️"), 0);
  assert.equal(emojiOnlyCount("❤️ #tag"), 0);
  assert.equal(emojiOnlyCount("©"), 0);
  assert.equal(emojiOnlyCount("12"), 0);
  assert.equal(emojiOnlyCount(""), 0);
  assert.equal(emojiOnlyCount("   "), 0);
  assert.equal(emojiOnlyCount("🔥".repeat(2000)), 2000);
});
