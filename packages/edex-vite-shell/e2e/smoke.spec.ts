import { expect, test } from "@playwright/test";

test.describe("edex-vite-shell smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("termix.edex.v1.autoAbout", "1");
    });
  });

  test("main shell and terminal surface mount", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main_shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".xterm-screen")).toBeVisible();
  });

  test("about modal opens via shortcut", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main_shell")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Control+Shift+KeyB");
    await expect(
      page.getByRole("dialog", { name: /Termix \(eDEX shell\)/i }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: /Termix \(eDEX shell\)/i }),
    ).toBeHidden();
  });

  test("terminal surface focuses for input", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main_shell")).toBeVisible({ timeout: 30_000 });
    await page.locator("#terminal0").click();
    await expect(page.locator(".xterm-helper-textarea")).toBeFocused();
  });
});
