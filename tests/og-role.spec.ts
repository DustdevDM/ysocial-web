import { expect, test } from "@playwright/test";

test("profiles show OG and explicitly assigned badges with tooltips", async ({ page }) => {
  const [ogMember, newMember, adminMember, developer] = [
    { id: "11111111-1111-4111-8111-111111111111", handle: "og_member", displayName: "OG Member", avatarUrl: null, isOg: true },
    { id: "22222222-2222-4222-8222-222222222222", handle: "new_member", displayName: "New Member", avatarUrl: null },
    {
      id: "33333333-3333-4333-8333-333333333333",
      handle: "admin_member",
      displayName: "Admin Member",
      avatarUrl: null,
      isAdmin: true,
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      handle: "dev_user",
      displayName: "Dev User",
      avatarUrl: null,
      isOg: false,
      badges: [{ id: "55555555-5555-4555-8555-555555555555", icon: "terminal", tooltip: "Developed this" }],
    },
  ] as const;
  const members = [ogMember, newMember, adminMember, developer];
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

  await page.goto("/@" + ogMember.handle);
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

  await page.goto("/@" + newMember.handle);
  await expect(page.getByRole("heading", { name: "New Member" })).toBeVisible();
  await expect(badge).toHaveCount(0);
  const adminBadge = page.getByRole("button", { name: "Admin", exact: true });
  const developerBadge = page.getByRole("button", { name: "Developed this" });
  await expect(adminBadge).toHaveCount(0);

  await page.goto("/@" + adminMember.handle);
  await expect(page.getByRole("heading", { name: "Admin Member" })).toBeVisible();
  await expect(adminBadge).toHaveCount(0);
  await expect(developerBadge).toHaveCount(0);

  await page.goto("/@" + developer.handle);
  await expect(page.getByRole("heading", { name: "Dev User" })).toBeVisible();
  await expect(badge).toHaveCount(0);
  await expect(developerBadge.locator("span")).toHaveCSS("mask-image", /\/api\/profiles\/badge-icons\/terminal/);
  await developerBadge.hover();
  await expect(tooltip).toHaveText("Developed this");
});
