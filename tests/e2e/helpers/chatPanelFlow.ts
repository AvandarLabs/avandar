import type { Locator, Page } from "@playwright/test";

import { expect } from "@playwright/test";

import { MEDIUM_WAIT } from "./timeouts";

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
 * Locates the chat composer input on Data Explorer or dashboard pages.
 */
export function getChatComposerInput(page: Page): Locator {
  return page.getByPlaceholder(
    /ask about your data|ask me to add a chart to this dashboard/i,
  );
}

/**
 * Locates the New chat control in the chat panel header.
 */
export function getNewChatButton(page: Page): Locator {
  return getChatPanel(page).getByRole("button", { name: /new chat/i });
}

/**
 * Locates the AppShell chat Aside (Ask Avandar panel).
 */
export function getChatPanel(page: Page): Locator {
  return page.getByRole("complementary").filter({ hasText: "Ask Avandar" });
}
