import { expect, test } from "@playwright/test";

test("only OG members get a profile gem badge", async ({ page }) => {
  const members = [
    { id: "11111111-1111-4111-8111-111111111111", handle: "og_member", displayName: "OG Member", avatarUrl: null, isOg: true },
    { id: "22222222-2222-4222-8222-222222222222", handle: "new_member", displayName: "New Member", avatarUrl: null, isOg: false },
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
});
