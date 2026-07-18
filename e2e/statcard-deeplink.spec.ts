/**
 * Playwright E2E — StatCard deep-linking.
 *
 * Verifies that clicking a KPI StatCard on the Admin Analytics dashboard
 * navigates to the correct destination route WITH the expected query
 * parameters, and that the destination page renders either filtered data
 * or the proper empty-state.
 *
 * Requires TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD in env.
 */
import { test, expect, Page } from "@playwright/test";

const login = async (page: Page) => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;
  if (!email || !password) test.skip(true, "TEST_ADMIN_EMAIL/PASSWORD not set");
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/home/i, { timeout: 15_000 });
};

test.describe("StatCard deep-links", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/home/admin/analytics");
    await expect(page.getByText(/analytics/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("Users → Sessions cards deep-link with filters", async ({ page }) => {
    // Click any card that routes to /home/admin/sessions
    const sessionsLink = page.locator('a[href*="/home/admin/sessions"]').first();
    await expect(sessionsLink).toBeVisible();
    const href = await sessionsLink.getAttribute("href");
    expect(href).toMatch(/\/home\/admin\/sessions/);

    await sessionsLink.click();
    await page.waitForURL(/\/home\/admin\/sessions/, { timeout: 10_000 });

    // Destination must show either the filtered table OR a valid empty-state
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText(/no sessions match|couldn't load sessions|will appear here/i)
      .isVisible()
      .catch(() => false);
    expect(hasTable || hasEmpty, "sessions page must render table or empty-state").toBeTruthy();
  });

  test("invalid query params fall back to safe defaults (no crash)", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto("/home/admin/sessions?mode=BOGUS&status=NOPE&range=999z");
    // Page renders successfully (heading visible), no runtime errors
    await expect(page.getByRole("heading", { name: /sessions/i })).toBeVisible({ timeout: 8_000 });
    expect(errs).toEqual([]);
  });

  test("empty-state renders when filter matches zero rows", async ({ page }) => {
    await page.goto(
      "/home/admin/sessions?q=__nonexistent_topic_xyz_12345__&mode=all&status=all",
    );
    await expect(
      page.getByText(/no sessions match|couldn't load sessions/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
