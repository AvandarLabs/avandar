import { expect } from "@playwright/test";
import { MEDIUM_WAIT } from "./timeouts";
import type { Locator, Page } from "@playwright/test";

/**
 * Opens the AppShell chat Aside. Uses the keyboard shortcut so Mantine
 * drawers (e.g. Data Explorer "Open") cannot intercept toolbar clicks.
 */
export async function openChatPanelIfClosed(page: Page): Promise<void> {
  const composer = getChatComposerInput(page);
  if (await composer.isVisible()) {
    return;
  }

  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+/");

  await expect(composer).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * Locates the chat composer input on the Data Explorer page.
 */
export function getChatComposerInput(page: Page): Locator {
  return page.getByPlaceholder(/ask about your data/i);
}
