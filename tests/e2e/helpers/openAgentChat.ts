import { expect } from "@playwright/test";
import { LONG_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/**
 * Whether the agent's message box is on screen. A closed chat panel keeps
 * it in the page, outside the viewport, so visibility alone does not tell.
 */
async function _isComposerOnScreen(page: Page): Promise<boolean> {
  const box = await page.getByLabel("Message", { exact: true }).boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) {
    return false;
  }
  return box.x >= 0 && box.x + box.width <= viewport.width;
}

/**
 * Opens the chat panel with the agent on, unless it is already open. The
 * panel's open state survives a reload, and the header's "Chat" button
 * toggles it, so the button is clicked only when the message box is off
 * screen.
 */
export async function openAgentChat(page: Page): Promise<void> {
  const chatToggle = page.getByRole("button", { name: /^chat$/i });
  const composer = page.getByLabel("Message", { exact: true });
  await expect(chatToggle).toBeVisible({ timeout: LONG_WAIT });
  await expect(composer).toBeAttached({ timeout: LONG_WAIT });
  if (!(await _isComposerOnScreen(page))) {
    await chatToggle.click();
  }
  await expect(composer).toBeInViewport();
}
