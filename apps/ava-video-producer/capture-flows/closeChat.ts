import type { Page } from "@playwright/test";

/**
 * Closes the chat panel if it is open, so it cannot cover the UI under test.
 */
export async function closeChat(page: Page): Promise<void> {
  const chat = page.getByRole("button", { name: "Chat", exact: true });
  if (
    (await chat.count()) &&
    (await chat.getAttribute("aria-pressed")) === "true"
  ) {
    await chat.click();
  }
}
