// Run with Node 22.18+ using: node --test scripts/check-post-links.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  firstPostEmbed,
  splitPostLinks,
} from "../src/features/feed/post-links.ts";

const id = "219983a0-e733-4987-8304-5de1ad3a7d5d";

test("detects every web link, including repeats and bare domains", () => {
  assert.equal(
    splitPostLinks(
      "example.org https://example.org/a https://example.org/a http://localhost:3000/test www.example.net https://example.com",
    ).filter(({ kind }) => kind === "external").length,
    6,
  );
});

test("detects post links on the current YSocial host and preserves the destination", () => {
  const route = `/posts/${id}?source=feed#reply`;
  assert.deepEqual(splitPostLinks(`See (ysocial.cns-preview.de${route}).`), [
    { kind: "text", text: "See (" },
    {
      kind: "post",
      text: `ysocial.cns-preview.de${route}`,
      postId: id,
      href: `https://ysocial.cns-preview.de${route}`,
    },
    { kind: "text", text: ")." },
  ]);
  assert.equal(
    splitPostLinks("https://ysocial.cns-preview.de/topics/news")[0].kind,
    "owned",
  );
  assert.equal(
    splitPostLinks("https://ysocial.cns-preview.de/posts/invalid")[0].kind,
    "owned",
  );
});

test("trusts the parsed hostname, standard ports, and no credentials", () => {
  for (const host of [
    "ysocial.cc",
    "ysocial.cns-preview.de.example.org",
    "example.ysocial.cns-preview.de",
    "ysocial.cns-preview.de@example.org",
    "example.org@ysocial.cns-preview.de",
    "ysocial.cns-preview.de:8443",
  ]) {
    const href = `https://${host}/posts/${id}`;
    assert.equal(splitPostLinks(href)[0].kind, "external", href);
  }
});

test("keeps URL fragments and mentions inside a single link", () => {
  const href = "https://example.org/search?q=@alice#news";
  assert.deepEqual(splitPostLinks(`@alice #news ${href}!`), [
    { kind: "text", text: "@alice #news " },
    { kind: "external", text: href, href },
    { kind: "text", text: "!" },
  ]);
  assert.deepEqual(splitPostLinks("ftp://example.org/archive"), [
    { kind: "text", text: "ftp://example.org/archive" },
  ]);
});

test("treats localhost:3000 as first-party only during development", () => {
  const localPost = `localhost:3000/posts/${id}?from=feed#reply`;
  const href = `http://${localPost}`;
  for (const link of [localPost, href]) {
    assert.deepEqual(splitPostLinks(link, true), [
      { kind: "post", text: link, href, postId: id },
    ]);
    assert.equal(splitPostLinks(link)[0].kind, "external");
  }
  assert.deepEqual(splitPostLinks("localhost:3000/topics/news", true), [
    {
      kind: "owned",
      href: "http://localhost:3000/topics/news",
      text: "localhost:3000/topics/news",
    },
  ]);
  for (const authority of [
    "localhost:3001",
    "localhost.example.org:3000",
    "user@localhost:3000",
  ]) {
    const href = `http://${authority}/posts/${id}`;
    assert.equal(splitPostLinks(href, true)[0].kind, "external", href);
  }
});

test("a post and an external website compete for one preview in link order", () => {
  const ownedPost = `https://ysocial.cns-preview.de/posts/${id}`;
  const external = "https://example.org/project";
  const plain = "https://ysocial.cns-preview.de/topics/news http://127.0.0.1";
  assert.equal(
    firstPostEmbed(splitPostLinks(`${plain} ${ownedPost} ${external}`))?.href,
    ownedPost,
  );
  assert.equal(
    firstPostEmbed(splitPostLinks(`${plain} ${external} ${ownedPost}`))?.href,
    external,
  );
  assert.equal(firstPostEmbed(splitPostLinks(plain)), undefined);
});
