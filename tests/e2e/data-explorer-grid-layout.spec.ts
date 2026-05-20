import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  getChatComposerInput,
  openChatPanelIfClosed,
} from "./helpers/chatPanelFlow";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

const CHAT_PROMPT = "Show the first 20 rows of LONG_us_confirmed_cases.csv";
const MOCK_CHAT_SQL = `
  SELECT
    value AS row_num
  FROM generate_series(1, 60) AS row_numbers(value)
`;

/**
 * The table canvas should reserve full height before any query runs, and it
 * should remain interactive after chat-generated SQL populates results.
 */
test.describe("Data Explorer grid layout", () => {
  test("keeps the table full-height before and after a chat-generated query", async ({
    page,
    e2eWorkerDb,
  }) => {
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    await page.route("**/chat/*/messages", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          assistantText: "Here are the first rows.",
          generatedSql: {
            prompt: CHAT_PROMPT,
            sql: MOCK_CHAT_SQL,
          },
        }),
      });
    });

    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-explorer`);
    await dismissBlockingOverlays(page);

    const gridRoot = page.locator(".ag-root-wrapper").first();
    await page.waitForSelector(".ag-root-wrapper", {
      state: "attached",
      timeout: MEDIUM_WAIT,
    });

    await page.screenshot({
      path: ".playwright-mcp/data-explorer-empty-grid.png",
      fullPage: true,
    });

    const emptyGridHeight = await gridRoot.evaluate((node) => {
      return node.getBoundingClientRect().height;
    });
    expect(emptyGridHeight).toBeGreaterThan(300);

    await openChatPanelIfClosed(page);
    const composer = getChatComposerInput(page);
    await composer.fill(CHAT_PROMPT);
    await composer.press("Enter");

    await expect(
      page.getByRole("columnheader", { name: "row_num" }).first(),
    ).toBeVisible({ timeout: LONG_WAIT });

    await page.screenshot({
      path: ".playwright-mcp/data-explorer-chat-grid.png",
      fullPage: true,
    });

    const populatedGridHeight = await gridRoot.evaluate((node) => {
      return node.getBoundingClientRect().height;
    });
    expect(populatedGridHeight).toBeGreaterThan(300);

    const nextPageButton = page
      .locator('.ag-paging-button[aria-label="Next Page"]')
      .first();
    await expect(nextPageButton).toBeEnabled();
    await nextPageButton.click();

    await expect
      .poll(async () => {
        return (
          await page
            .locator(".ag-paging-page-summary-panel")
            .first()
            .textContent()
        )?.replace(/\s+/g, " ");
      })
      .toContain("Page 2 of 2", {
        timeout: MEDIUM_WAIT,
      });
  });
});
