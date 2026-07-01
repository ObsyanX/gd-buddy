import { test, expect } from "@playwright/test";

/**
 * Mobile-first regression guard.
 * Asserts no horizontal overflow on public routes at 375px (iPhone SE width).
 * Authenticated routes are excluded because they redirect to /auth without a session.
 */

const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/about",
  "/how-to-crack-gd",
  "/gd-preparation-guide",
  "/communication-skills",
  "/body-language-tips",
  "/common-gd-mistakes",
  "/ai-gd-simulator",
];

test.use({ viewport: { width: 375, height: 812 } });

for (const route of PUBLIC_ROUTES) {
  test(`no horizontal overflow at 375px on ${route}`, async ({ page }) => {
    await page.goto(`http://localhost:8080${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const { scrollW, innerW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    }));
    expect(scrollW, `${route} overflows viewport`).toBeLessThanOrEqual(innerW + 1);
  });
}
