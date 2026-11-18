import assert from "node:assert/strict";
import { test } from "node:test";
import { projectRepostContext } from "../src/features/feed/repost-context.ts";
import { quoteOf } from "../src/features/feed/quote.ts";

const person = (id) => ({ id, handle: `user_${id}`, displayName: `User ${id}`, avatarUrl: null });
const viewer = person("me");
const other = person("other");
const post = (extra = {}) => ({
  id: "p1",
  parentId: null,
  content: "hello",
  gif: null,
  poll: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  editedAt: null,
  author: person("author"),
  reposted: false,
  repostAudience: null,
  quote: null,
  ...extra,
});
const base = (by, extra = {}) => ({ by, audience: "public", others: 0, ...extra });

test("signed-out viewers see the server's label unchanged", () => {
  assert.equal(projectRepostContext(post(), undefined, null, true), null);
  const context = base(other);
  assert.equal(projectRepostContext(post(), context, null, true), context);
});

test("someone else's repost stays when the viewer has not reposted", () => {
  const context = base(other, { others: 2 });
  assert.equal(projectRepostContext(post(), context, viewer, true), context);
});

test("a repost the viewer just made shows 'You' in the home feed only", () => {
  const mine = post({ reposted: true, repostAudience: "friends" });
  assert.deepEqual(projectRepostContext(mine, undefined, viewer, true), {
    by: viewer,
    audience: "friends",
    others: 0,
  });
  // Joining existing reposters counts them as others.
  assert.equal(projectRepostContext(mine, base(other, { others: 1 }), viewer, true).others, 2);
  // Lists with their own context (profiles) are left alone.
  assert.equal(projectRepostContext(mine, undefined, viewer, false), null);
  assert.equal(projectRepostContext(mine, base(other), viewer, false).by.id, "other");
});

test("the viewer's own label follows their optimistic undo and audience switch", () => {
  const context = base(viewer, { audience: "public" });
  assert.equal(projectRepostContext(post({ reposted: false }), context, viewer, true), null);
  const switched = projectRepostContext(
    post({ reposted: true, repostAudience: "friends" }),
    context,
    viewer,
    true,
  );
  assert.equal(switched.audience, "friends");
});

test("a quote embeds the original one level deep", () => {
  const original = post({ id: "o1", poll: { title: "Pick one" }, gif: { url: "u", title: "t" } });
  const embed = quoteOf(original);
  assert.equal(embed.state, "available");
  assert.equal(embed.post.id, "o1");
  assert.equal(embed.post.pollTitle, "Pick one");
  assert.equal(embed.post.isQuote, false);
  assert.deepEqual(embed.post.gif, { url: "u", title: "t" });
  // Quoting a quote only says that it is one; it never nests.
  const nested = quoteOf(post({ quote: embed }));
  assert.equal(nested.post.isQuote, true);
  assert.equal("quote" in nested.post, false);
});
