import type { Page } from "@playwright/test";

/**
 * Closes Mantine drawers/overlays (e.g. Data Explorer "Open") that block
 * toolbar clicks in Playwright.
 */
export async function dismissBlockingOverlays(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}
