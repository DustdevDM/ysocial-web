import { expect, test } from "@playwright/test";

test("long feed posts can expand and collapse in place", async ({ page }) => {
  const post = {
    id: "00000000-0000-4000-8000-000000000001",
    content: Array.from({ length: 10 }, (_, line) => `Line ${line + 1}`).join("\n"),
    author: {
      id: "88888888-8888-4888-8888-888888888888",
      handle: "feed_tester",
      displayName: "Feed tester",
      avatarUrl: null,
    },
    parentId: null,
    createdAt: new Date().toISOString(),
    editedAt: null,
    editExpiresAt: new Date().toISOString(),
    likes: 0,
    liked: false,
    replies: 0,
    reposts: 0,
    reposted: false,
  };
  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/auth/me", (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.route("**/api/posts", (route) =>
    route.fulfill({
      json: { posts: [post], nextCursor: null, serverNow: post.createdAt },
    }),
  );
  await page.goto("/");

  const caption = page.locator("article p[data-selectable]");
  const isClipped = () =>
    caption.evaluate(
      (element) =>
        element.getBoundingClientRect().height >
        (element.parentElement?.clientHeight ?? 0) + 1,
    );
  const more = page.getByRole("button", { name: "Read more" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  expect(await isClipped()).toBe(true);
  await more.click();
  const less = page.getByRole("button", { name: "Read less" });
  await expect(less).toHaveAttribute("aria-expanded", "true");
  expect(await isClipped()).toBe(false);
  await less.click();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  expect(await isClipped()).toBe(true);
});
