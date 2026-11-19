import { expect, test } from "@playwright/test";

test("profiles show role badges and assigned badges with tooltips", async ({ page }) => {
  const members = [
    { id: "11111111-1111-4111-8111-111111111111", handle: "og_member", displayName: "OG Member", avatarUrl: null, isOg: true },
    { id: "22222222-2222-4222-8222-222222222222", handle: "new_member", displayName: "New Member", avatarUrl: null, isOg: false },
    {
      id: "33333333-3333-4333-8333-333333333333",
      handle: "admin_member",
      displayName: "Admin Member",
      avatarUrl: null,
      isAdmin: true,
      badges: [{ id: "44444444-4444-4444-8444-444444444444", icon: "bike", tooltip: "Organized a group ride" }],
    },
  ];
  const serverNow = new Date().toISOString();

  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/auth/me", (route) =>
    route.fulfill({ json: { authenticated: false } }),
  );
  await page.route("**/api/profiles/*", (route) => {
    const member = members.find(({ handle }) => route.request().url().endsWith("/" + handle));
    if (!member) return route.fallback();
    return route.fulfill({
      json: {
        profile: {
          ...member,
          bio: "",
          bannerUrl: null,
          bannerCrop: null,
          createdAt: serverNow,
          followerCount: 0,
          followingCount: 0,
        },
        isFollowing: false,
        isFollowedBy: false,
        posts: [],
        reposts: [],
        replies: [],
        serverNow,
      },
    });
  });

  await page.goto("/@og_member");
  await expect(page.getByRole("heading", { name: "OG Member" })).toBeVisible();
  const badge = page.getByRole("button", { name: "OG member" });
  const tooltip = page.getByRole("tooltip");
  await badge.hover();
  await expect(tooltip).toHaveText("Joined before the big migration");
  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();
  await badge.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(badge).toBeFocused();
  await expect(tooltip).toHaveText("Joined before the big migration");

  await page.goto("/@new_member");
  await expect(page.getByRole("heading", { name: "New Member" })).toBeVisible();
  await expect(badge).toHaveCount(0);
  const adminBadge = page.getByRole("button", { name: "Admin", exact: true });
  await expect(adminBadge).toHaveCount(0);

  await page.goto("/@admin_member");
  await expect(page.getByRole("heading", { name: "Admin Member" })).toBeVisible();
  await expect(adminBadge.locator("svg.lucide-terminal")).toBeVisible();
  await adminBadge.hover();
  await expect(tooltip).toHaveText("Developed this");
  const customBadge = page.getByRole("button", { name: "Organized a group ride" });
  await expect(customBadge.locator("span")).toHaveCSS("mask-image", /\/api\/profiles\/badge-icons\/bike/);
  await customBadge.hover();
  await expect(page.getByRole("tooltip", { name: "Organized a group ride" })).toBeVisible();
});
