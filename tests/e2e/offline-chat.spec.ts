import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  getChatComposerInput,
  openChatPanelIfClosed,
} from "./helpers/chatPanelFlow";
import {
  formatImportPreviewRowCount,
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { LONG_WAIT } from "./helpers/timeouts";

test.describe("offline WebLLM chat (mocked)", () => {
  test("answers with local mock SQL when browser is offline", async ({
    page,
    e2eWorkerDb,
  }) => {
    let cloudChatCalled = false;
    await page.route("**/functions/v1/chat/*/messages", async (route) => {
      if (route.request().method() === "POST") {
        cloudChatCalled = true;
      }
      await route.abort("failed");
    });

    await page.addInitScript(() => {
      window.localStorage.setItem(
        "avandar.offlineChat.downloadedModels",
        JSON.stringify({ "qwen-1.5b": true }),
      );
      window.localStorage.setItem(
        "avandar.offlineChat.selectedModelId",
        "qwen-1.5b",
      );
      window.__AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__ = [
        {
          match: "offline assistant",
          response: '{"summary":"Count rows","proceed":true}',
        },
        {
          match: "DuckDB SQL generator",
          response:
            "Here is the query.\n```sql\nSELECT COUNT(*) AS row_count FROM \"DATASET_ID\"\n```",
        },
      ];
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-manager/data-import`);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
    await uploadPanel.getByRole("button", { name: "Upload", exact: true }).click();

    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: LONG_WAIT });

    const formattedPreviewRowCount = formatImportPreviewRowCount(
      SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
    );
    await expect(
      page.getByText(`Parsed ${formattedPreviewRowCount} rows successfully`),
    ).toBeVisible({ timeout: LONG_WAIT });

    await page.getByRole("button", { name: "Save dataset" }).click();
    await expect(page).toHaveURL(/\/data-explorer\//, { timeout: LONG_WAIT });

    await dismissBlockingOverlays(page);
    await openChatPanelIfClosed(page);

    await page.context().setOffline(true);

    const composer = getChatComposerInput(page);
    await composer.fill("How many rows are in this dataset?");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText(/offline/i).first()).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect(page.getByText(/SELECT COUNT/i)).toBeVisible({
      timeout: LONG_WAIT,
    });

    expect(cloudChatCalled).toBe(false);
  });
});
