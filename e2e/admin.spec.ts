/**
 * Playwright E2E — Admin section runtime error guardrail.
 *
 * Simulates 2–6 participants viewing the app and asserts the /home/admin
 * route does not surface uncaught runtime errors, hook-order warnings, or
 * React internal crashes. Requires TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD.
 *
 * Run: npx playwright test
 */
import { test, expect, Page } from "@playwright/test";

const HOOK_ORDER_RE =
  /(Should have a queue|change in the order of Hooks|Cannot access .* before initialization|Rendered (more|fewer) hooks than)/i;

const collectRuntimeErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (HOOK_ORDER_RE.test(text)) errors.push(`console.error: ${text}`);
    }
  });
  return errors;
};

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

test.describe("Admin — no runtime errors during multi-participant activity", () => {
  for (const participants of [2, 4, 6]) {
    test(`admin stays clean with ${participants} concurrent viewers`, async ({ browser }) => {
      const contexts = await Promise.all(
        Array.from({ length: participants }).map(() => browser.newContext()),
      );
      const pages = await Promise.all(contexts.map((c) => c.newPage()));
      const allErrors = pages.map((p) => collectRuntimeErrors(p));

      // Admin drives the admin page; peers idle on /home simulating pauses/interruptions/TTS activity
      const admin = pages[0];
      await login(admin);
      await admin.goto("/home/admin");
      await expect(admin.getByText(/ADMIN DASHBOARD/i)).toBeVisible({ timeout: 15_000 });

      // Peers exercise the app in parallel
      await Promise.all(
        pages.slice(1).map(async (p) => {
          await p.goto("/home");
          await p.waitForTimeout(500);
          await p.reload();               // pause + resume
          await p.waitForTimeout(500);
          // Trigger TTS if supported
          await p.evaluate(() => {
            try {
              const u = new SpeechSynthesisUtterance("test");
              window.speechSynthesis.speak(u);
              window.speechSynthesis.cancel();
            } catch { /* ignore */ }
          });
        }),
      );

      // Cycle admin tabs
      for (const label of ["USERS", "SESSIONS", "FEEDBACK", "ERRORS"]) {
        await admin.getByRole("tab", { name: new RegExp(label, "i") }).click().catch(() => {});
        await admin.waitForTimeout(300);
      }

      // Assert no runtime errors on admin page
      expect(allErrors[0], `Admin runtime errors:\n${allErrors[0].join("\n")}`).toEqual([]);

      await Promise.all(contexts.map((c) => c.close()));
    });
  }
});
