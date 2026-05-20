import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  getChatComposerInput,
  openChatPanelIfClosed,
} from "./helpers/chatPanelFlow";
import {
  EXPECTED_CSV_COLUMN_NAMES,
  formatImportPreviewRowCount,
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { parseDatasetIdFromDataManagerUrl } from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
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
    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: LONG_WAIT });

    const formattedPreviewRowCount = formatImportPreviewRowCount(
      SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
    );
    await expect(
      page.getByText(`Parsed ${formattedPreviewRowCount} rows successfully`),
    ).toBeVisible({ timeout: LONG_WAIT });

    await page.getByRole("button", { name: /Save [Dd]ataset/ }).click();
    await expect(page).toHaveURL(
      new RegExp(`/${e2eWorkerDb.workspaceSlug}/data-manager/[0-9a-f-]{36}`),
      { timeout: LONG_WAIT },
    );

    const datasetId = parseDatasetIdFromDataManagerUrl({
      url: page.url(),
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    if (!datasetId) {
      throw new Error("Expected dataset id in data-manager URL after save");
    }

    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: createSupabaseAdminClient(),
      slug: e2eWorkerDb.workspaceSlug,
    });

    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-explorer`, {
      waitUntil: "domcontentloaded",
    });
    await dismissBlockingOverlays(page);
    await page.getByRole("button", { name: /^open$/i }).click();
    const openDrawer = page.getByRole("dialog", { name: /open dataset/i });
    await openDrawer
      .getByRole("row")
      .filter({ hasText: "small-california-covid-sample.csv" })
      .getByRole("button", { name: /^open$/i })
      .click();
    await dismissBlockingOverlays(page);
    await openChatPanelIfClosed(page);

    await page.context().setOffline(true);

    await page.evaluate(
      ({ cacheWorkspaceId, tableId, columnNames }) => {
        window.__AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__ = [
          {
            match: "offline assistant",
            response: '{"summary":"Count rows","proceed":true}',
          },
          {
            match: "DuckDB SQL generator",
            response: `Here is the query.\n\`\`\`sql\nSELECT COUNT(*) AS row_count FROM "${tableId}"\n\`\`\``,
          },
        ];
        const columns = columnNames.map((name) => {
          return {
            dataset_id: tableId,
            name,
            data_type: "VARCHAR",
          };
        });
        window.sessionStorage.setItem(
          `avandar.offlineChat.schemaCache.${cacheWorkspaceId}`,
          JSON.stringify({
            datasets: [
              {
                id: tableId,
                name: "small-california-covid-sample.csv",
              },
            ],
            columns,
          }),
        );
        void window.__resetOfflineChatEngine?.();
      },
      {
        cacheWorkspaceId: workspaceId,
        tableId: datasetId,
        columnNames: EXPECTED_CSV_COLUMN_NAMES,
      },
    );

    const composer = getChatComposerInput(page);
    await composer.fill("How many rows are in this dataset?");
    await composer.press("Enter");

    await expect
      .poll(() => {
        return cloudChatCalled;
      })
      .toBe(false);

    await expect(page.getByText(/Writing query \(offline\)/i)).toBeVisible({
      timeout: LONG_WAIT,
    });

    await page.getByRole("tab", { name: "SQL" }).click();
    await expect(page.getByText(/SELECT COUNT/i).first()).toBeVisible({
      timeout: LONG_WAIT,
    });
  });
});
