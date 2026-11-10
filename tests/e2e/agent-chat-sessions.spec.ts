/**
 * Browser proof that chat tabs preserve independent threads, archived chats
 * can be restored or deleted, and the composer layout survives navigation.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { getNewChatButton } from "./helpers/chatPanelFlow";
import { openAgentChat } from "./helpers/openAgentChat";
import type { Locator, Page } from "@playwright/test";

/** A completed text response from the mocked data-agent proxy. */
function _replyStream(): string {
  const usage = {
    input: 10,
    output: 5,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 15,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
  const events = [
    { type: "start" },
    { type: "text_start", contentIndex: 0 },
    { type: "text_delta", contentIndex: 0, delta: "Forty two." },
    { type: "text_end", contentIndex: 0, contentSignature: "" },
    { type: "done", reason: "stop", usage },
  ];
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

/** The chat tabs inside the panel, excluding similarly named archive rows. */
function _getChatTab(page: Page, name: string): Locator {
  return page.getByRole("tablist").getByRole("tab", { name, exact: true });
}

/** Closes one named chat through the button beside its tab. */
async function _closeChat(page: Page, name: string): Promise<void> {
  await _getChatTab(page, name)
    .locator("..")
    .getByRole("button", { name: "Close chat" })
    .click();
}

/** The closed-chat row containing the exact session title. */
function _getClosedChatRow(page: Page, name: string): Locator {
  return page.getByRole("menu").getByText(name, { exact: true }).locator("..");
}

test.describe("agent chat sessions", () => {
  test("session threads and panel layout survive chat and page changes", async ({
    page,
    e2eWorkerDb,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("avandar:data-agent", "on");
    });
    await page.route(
      "**/functions/v1/chat/*/agent/data-agent-v3/api/stream",
      async (route) => {
        await route.fulfill({
          contentType: "text/event-stream",
          body: _replyStream(),
        });
      },
    );
    await page.route(
      "**/functions/v1/chat/*/title/chat-title-v1",
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ title: "Case counts" }),
        });
      },
    );

    const { primaryUser, workspaceSlug } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    await page.goto(`/${workspaceSlug}/data-explorer`);
    await openAgentChat(page);

    const messageBox = page.getByRole("textbox", {
      name: "Message",
      exact: true,
    });
    await messageBox.fill("How many cases?");
    await messageBox.press("Enter");
    await expect(_getChatTab(page, "Case counts")).toBeVisible();
    await expect(
      page.getByText("How many cases?", { exact: true }),
    ).toBeVisible();

    await getNewChatButton(page).click();
    await expect(_getChatTab(page, "New chat")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(_getChatTab(page, "Case counts")).toBeVisible();
    await expect(page.locator('[data-chat-layout="docked"]')).toBeVisible();

    await page.reload();
    await openAgentChat(page);
    await expect(_getChatTab(page, "New chat")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByText("How many cases?", { exact: true }),
    ).toHaveCount(0);

    await _getChatTab(page, "Case counts").click();
    await expect(
      page.getByText("How many cases?", { exact: true }),
    ).toBeVisible();

    await _closeChat(page, "Case counts");
    await expect(_getChatTab(page, "Case counts")).toHaveCount(0);
    await page.getByRole("button", { name: "Closed chats" }).click();
    await _getClosedChatRow(page, "Case counts")
      .getByRole("button", { name: "Reopen chat" })
      .click();
    await expect(_getChatTab(page, "Case counts")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByText("How many cases?", { exact: true }),
    ).toBeVisible();

    await _closeChat(page, "New chat");
    await page.getByRole("button", { name: "Closed chats" }).click();
    await _getClosedChatRow(page, "New chat")
      .getByRole("button", { name: "Delete chat" })
      .click();
    await expect(page.getByText("New chat", { exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: "Case Manager", exact: true }).click();
    await page.getByRole("button", { name: "New case type" }).first().click();
    await expect(_getChatTab(page, "New case type")).toBeVisible();
    await expect(_getChatTab(page, "Case counts")).toBeVisible();
    await expect(page.locator('[data-chat-layout="composer"]')).toBeVisible();

    await _getChatTab(page, "Case counts").click();
    await expect(page.locator('[data-chat-layout="composer"]')).toBeVisible();

    await page
      .getByRole("link", { name: "Data Explorer", exact: true })
      .press("Enter");
    await expect(page.locator('[data-chat-layout="composer"]')).toBeVisible();
  });
});
