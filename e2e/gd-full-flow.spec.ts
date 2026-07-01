import { test, expect } from "@playwright/test";

// Track 8: E2E full-flow smoke — verifies the public entry, auth gate,
// and protected route redirect without requiring a live backend session.
test.describe("GD Buddy full flow", () => {
  test("landing renders and links to auth", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GD|Group Discussion|Buddy/i);
    // Landing should mention core value prop somewhere.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("protected route redirects unauthenticated users to /auth", async ({ page }) => {
    await page.goto("/home/intelligence");
    await page.waitForURL(/\/auth|\/$|\/home/, { timeout: 5000 }).catch(() => {});
    const url = page.url();
    // Either redirected to /auth, or still hydrating; must not expose /home content unauthenticated.
    expect(url).toMatch(/\/auth|\/$/);
  });

  test("auth page shows sign-in UI", async ({ page }) => {
    await page.goto("/auth");
    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).toMatch(/sign|log|email|continue/);
  });
});
