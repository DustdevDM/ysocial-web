import { expect, test } from "@playwright/test";

const author = {
  id: "88888888-8888-4888-8888-888888888888",
  handle: "garden_gail",
  displayName: "Gardener Gail",
  avatarUrl: null,
};
const post = {
  id: "00000000-0000-4000-8000-000000000001",
  content: "Planting tomatoes in the garden today.",
  author,
  parentId: null,
  createdAt: new Date(Date.UTC(2026, 0, 1)).toISOString(),
  editedAt: null,
  editExpiresAt: new Date(Date.UTC(2026, 0, 1, 2)).toISOString(),
  likes: 0,
  liked: false,
  replies: 0,
  reposts: 0,
  reposted: false,
};

test("search finds people, topics and posts from one box", async ({ page }) => {
  const searches: URL[] = [];
  const postSearches: URL[] = [];
  await page.route("**/auth/me", (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/topics", (route) =>
    route.fulfill({ json: { topics: [], windowHours: 24 } }),
  );
  await page.route(/\/api\/search\?/, (route) => {
    const url = new URL(route.request().url());
    searches.push(url);
    const type = url.searchParams.get("type");
    const user = { ...author, bio: "Grows vegetables.", followerCount: 3 };
    const topic = { name: "garden", count: 7 };
    if (type === "users")
      return route.fulfill({ json: { users: [user], nextCursor: null } });
    if (type === "topics")
      return route.fulfill({ json: { topics: [topic], nextCursor: null } });
    return route.fulfill({
      json: {
        users: [user],
        topics: [topic],
        moreUsers: true,
        moreTopics: false,
      },
    });
  });
  await page.route(/\/api\/posts\?/, (route) => {
    postSearches.push(new URL(route.request().url()));
    return route.fulfill({
      json: {
        posts: [post],
        repostedBy: {},
        nextCursor: null,
        serverNow: new Date().toISOString(),
      },
    });
  });

  await page.goto("/search");
  const box = page.getByRole("searchbox", { name: "Search ysocial" });
  await expect(box).toBeFocused();

  await box.fill("g");
  await expect(page.getByText("Keep typing to search.")).toBeVisible();
  await page.waitForTimeout(500);
  expect(searches).toHaveLength(0);

  await box.fill("garden");
  await expect(page).toHaveURL(/\/search\?q=garden$/);
  await expect(box).toBeFocused();
  const people = page.getByRole("region", { name: "People" });
  await expect(
    people.getByRole("link", { name: /Gardener Gail/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Topics" })
      .getByRole("link", { name: /#garden/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Planting tomatoes in the garden today."),
  ).toBeVisible();
  expect(postSearches.at(-1)?.searchParams.get("q")).toBe("garden");

  await people.getByRole("button", { name: "See all" }).click();
  await expect(page).toHaveURL(/\/search\?q=garden&tab=people$/);
  await expect(page.getByRole("tab", { name: "People" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("link", { name: /Gardener Gail/ })).toBeVisible();
  expect(searches.at(-1)?.searchParams.get("type")).toBe("users");

  await page.getByRole("tab", { name: "Topics" }).click();
  await expect(page).toHaveURL(/tab=topics$/);
  await expect(page.getByRole("link", { name: /#garden/ })).toBeVisible();

  await page.getByRole("tab", { name: "Posts" }).click();
  await expect(page.getByRole("region", { name: "People" })).toHaveCount(0);
  await expect(
    page.getByText("Planting tomatoes in the garden today."),
  ).toBeVisible();

  await box.press("Enter");
  await box.press("Escape");
  await expect(page).toHaveURL(/\/search$/);
  await expect(box).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Recent searches" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "garden", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=garden$/);
});

test("slash opens search from any page and focuses the box", async ({
  page,
}) => {
  await page.route("**/auth/me", (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/topics", (route) =>
    route.fulfill({ json: { topics: [], windowHours: 24 } }),
  );
  await page.route(/\/api\/posts\?/, (route) =>
    route.fulfill({
      json: {
        posts: [],
        repostedBy: {},
        nextCursor: null,
        serverNow: new Date().toISOString(),
      },
    }),
  );
  await page.goto("/missing-page");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/search$/);
  await expect(
    page.getByRole("searchbox", { name: "Search ysocial" }),
  ).toBeFocused();
  await page.getByRole("searchbox", { name: "Search ysocial" }).blur();
  await page.keyboard.press("/");
  await expect(
    page.getByRole("searchbox", { name: "Search ysocial" }),
  ).toBeFocused();
  await expect(
    page.getByRole("searchbox", { name: "Search ysocial" }),
  ).toHaveValue("");
});

test("filters narrow posts by date, user and order", async ({ page }) => {
  const postRequests: URL[] = [];
  await page.route("**/auth/me", (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/topics", (route) =>
    route.fulfill({ json: { topics: [], windowHours: 24 } }),
  );
  await page.route(/\/api\/search\?/, (route) =>
    route.fulfill({
      json: { users: [], topics: [], moreUsers: false, moreTopics: false },
    }),
  );
  await page.route(/\/api\/posts\?/, (route) => {
    postRequests.push(new URL(route.request().url()));
    return route.fulfill({
      json: {
        posts: [post],
        repostedBy: {},
        nextCursor: null,
        serverNow: new Date().toISOString(),
      },
    });
  });

  await page.goto("/search?q=garden");
  await expect(
    page.getByText("Planting tomatoes in the garden today."),
  ).toBeVisible();
  expect(postRequests.at(-1)?.searchParams.get("user")).toBeNull();

  await page.getByRole("button", { name: "Filters" }).hover();
  await expect(
    page.locator('[data-slot="tooltip-content"]', { hasText: "Filters" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByLabel("From date").fill("2026-01-05");
  await page.getByLabel("To date").fill("2026-01-07");
  await page.getByLabel("From user").fill("@Garden_Gail");
  await page.getByLabel("Sort by").selectOption("oldest");
  await page.getByRole("button", { name: "Done" }).click();

  await expect(page).toHaveURL(/from=2026-01-05/);
  await expect(page).toHaveURL(/to=2026-01-07/);
  await expect(page).toHaveURL(/user=garden_gail/);
  await expect(page).toHaveURL(/sort=oldest/);
  await expect
    .poll(() => {
      const params = postRequests.at(-1)?.searchParams;
      return `${params?.get("sort")}|${params?.get("user")}`;
    })
    .toBe("oldest|garden_gail");
  const last = postRequests.at(-1)!.searchParams;
  expect(last.get("q")).toBe("garden");
  expect(last.get("user")).toBe("garden_gail");
  expect(last.get("from")).toBe(new Date("2026-01-05T00:00:00").toISOString());
  expect(last.get("to")).toBe(new Date("2026-01-08T00:00:00").toISOString());

  const chips = page.getByRole("list", { name: "Active filters" });
  await expect(
    chips.getByRole("button", { name: /@garden_gail/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filters, 4 active" }),
  ).toBeVisible();

  await chips.getByRole("button", { name: /Oldest first/ }).click();
  await expect(page).not.toHaveURL(/sort=oldest/);
  await expect(
    page.getByRole("button", { name: "Filters, 3 active" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Filters, 3 active" }).click();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page).toHaveURL(/\/search\?q=garden$/);

  await page.goto("/search?user=garden_gail");
  await expect(
    page.getByText("Planting tomatoes in the garden today."),
  ).toBeVisible();
  const filterOnly = postRequests.at(-1)!.searchParams;
  expect(filterOnly.get("q")).toBeNull();
  expect(filterOnly.get("user")).toBe("garden_gail");
  await expect(page.getByRole("tab", { name: "People" })).toHaveCount(0);
});

test("trending topics sit on the mobile home feed, not on search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/auth/me", (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/topics", (route) =>
    route.fulfill({
      json: { topics: [{ name: "garden", count: 7 }], windowHours: 24 },
    }),
  );
  await page.route(/\/api\/posts/, (route) =>
    route.fulfill({
      json: {
        posts: [],
        repostedBy: {},
        nextCursor: null,
        serverNow: new Date().toISOString(),
      },
    }),
  );
  await page.goto("/");
  await expect(
    page
      .getByRole("region", { name: "Trending topics" })
      .getByRole("link", { name: /#garden/ }),
  ).toBeVisible();
  await page.goto("/search");
  await expect(
    page.getByRole("searchbox", { name: "Search ysocial" }),
  ).toBeVisible();
  await expect(page.getByText("Trending", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Trending topics" }),
  ).toHaveCount(0);
});
