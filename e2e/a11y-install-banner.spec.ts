import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The PWA install banner is time-gated (usually ~10s) and env-gated
// (needs `beforeinstallprompt` OR iOS). We force it visible via localStorage
// keys the app owns, and fire a fake `beforeinstallprompt`.

test("PWA install banner has no critical a11y violations", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("gdb.pwaInstall.v1");
    // Fake matchMedia to keep the banner visible-eligible.
  });

  await page.goto("/");

  // Wait for React to mount then dispatch a synthetic install prompt event.
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => {
    class FakeBIP extends Event {
      constructor() { super("beforeinstallprompt", { cancelable: true }); }
      prompt() { return Promise.resolve(); }
      userChoice = Promise.resolve({ outcome: "dismissed" as const });
    }
    window.dispatchEvent(new FakeBIP());
  });

  const banner = page.getByRole("dialog", { name: /install gd buddy/i });
  await banner.waitFor({ state: "visible", timeout: 15_000 });

  await expect(banner.getByRole("button", { name: /install/i })).toBeVisible();
  await expect(banner.getByRole("button", { name: /later/i })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .disableRules(["region"])
    .analyze();

  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
});
