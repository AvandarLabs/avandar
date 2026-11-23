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
 * Returns a locator for the chat composer input on Data Explorer or dashboard
 * pages.
 * Use it, for example, when an E2E flow needs to interact with the composer.
 */
export function getChatComposerInput(page: Page): Locator {
  return page.getByPlaceholder(
    /ask about your data|ask me to add a chart to this dashboard/i,
  );
}

/**
 * Returns a locator for the New chat button in the chat panel.
 * Use it, for example, when an E2E flow needs to start a new chat.
 */
export function getNewChatButton(page: Page): Locator {
  return getChatPanel(page).getByRole("button", { name: /new chat/i });
}

/**
 * Returns a locator for the Ask Avandar complementary panel.
 * Use it, for example, when an E2E flow needs to find a control within the
 * panel.
 */
export function getChatPanel(page: Page): Locator {
  return page.getByRole("complementary").filter({ hasText: "Ask Avandar" });
}
