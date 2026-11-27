import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_CSV_PATH } from "./helpers/constants";
import { deleteDatasetViaDataManagerUiAndVerify } from "./helpers/deleteDatasetViaDataManagerUi";
import {
  makeDatasetPageUrlPatternFromWorkspaceSlug,
  parseDatasetIdFromDataManagerUrl,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

/** `idb-keyval` defaults, plus the persister key from `queryPersister.ts`. */
const IDB_NAME = "keyval-store";
const IDB_STORE = "keyval";
const PERSISTED_CACHE_KEY = "avandar-react-query-cache";

/**
 * Waits until the persisted React Query cache lists `datasetId` among the
 * workspace's datasets. The persister writes on a throttle, and a reload
 * before that write restores a workspace list without the new dataset, which
 * denies every query on it for a reason this spec is not about.
 */
async function _waitForPersistedWorkspaceDataset(
  options: Readonly<{ page: Page; datasetId: string }>,
): Promise<void> {
  await expect
    .poll(
      () => {
        return options.page.evaluate(
          ([dbName, storeName, cacheKey, datasetId]) => {
            return new Promise<boolean>((resolve, reject) => {
              const openRequest = indexedDB.open(dbName);
              openRequest.onerror = () => {
                return reject(openRequest.error);
              };
              openRequest.onsuccess = () => {
                const db = openRequest.result;
                if (!db.objectStoreNames.contains(storeName)) {
                  resolve(false);
                  return;
                }
                const getRequest = db
                  .transaction(storeName, "readonly")
                  .objectStore(storeName)
                  .get(cacheKey);
                getRequest.onerror = () => {
                  return reject(getRequest.error);
                };
                getRequest.onsuccess = () => {
                  const persisted =
                    typeof getRequest.result === "string"
                      ? JSON.parse(getRequest.result)
                      : undefined;
                  const queries: Array<{
                    queryKey: unknown;
                    state: { data: unknown };
                  }> = persisted?.clientState?.queries ?? [];
                  resolve(
                    queries.some((query) => {
                      return (
                        JSON.stringify(query.queryKey).includes(
                          "workspace_id",
                        ) &&
                        Array.isArray(query.state.data) &&
                        query.state.data.some((row: { id?: string }) => {
                          return row?.id === datasetId;
                        })
                      );
                    }),
                  );
                };
              };
            });
          },
          [
            IDB_NAME,
            IDB_STORE,
            PERSISTED_CACHE_KEY,
            options.datasetId,
          ] as const,
        );
      },
      { timeout: MEDIUM_WAIT },
    )
    .toBe(true);
}

/**
 * Uploads the small California CSV with cloud storage turned off and waits
 * for its dataset page.
 */
async function _uploadOfflineOnlyCsv(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<string> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("tabpanel", { name: "Upload" })
    .locator('input[type="file"]')
    .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
  await expect(page.getByText(/First \d+ rows/)).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  const cloudCheckbox = page.getByRole("checkbox", {
    name: /This dataset can be stored in the cloud/i,
  });
  await expect(cloudCheckbox).toBeVisible({ timeout: SHORT_WAIT });
  await cloudCheckbox.uncheck();
  await page.getByRole("button", { name: "Save Dataset" }).click();
  const datasetPageUrl =
    makeDatasetPageUrlPatternFromWorkspaceSlug(workspaceSlug);
  await expect
    .poll(
      () => {
        return datasetPageUrl.test(page.url());
      },
      { timeout: LONG_WAIT },
    )
    .toBe(true);
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (datasetId === undefined) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }
  return datasetId;
}

test.describe("Offline-only upload", () => {
  test("still shows its rows after the page reloads", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug,
    });

    const datasetId = await _uploadOfflineOnlyCsv({ page, workspaceSlug });
    await expect(
      page.getByRole("button", { name: "Allow online syncing" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(page.getByText("Alpine", { exact: true })).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    // The reload is the behavior under test: it empties this tab's DuckDB, so
    // the rows can only come from the copy this device kept. The preview's
    // rows are restored from the persisted query cache, so the column
    // summaries, which are first read after the reload, are what show it.
    await _waitForPersistedWorkspaceDataset({ page, datasetId });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Data Summary" }).click();
    await expect(page.getByText("1 distinct", { exact: true })).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    await expect(page.getByText(/Could not summarize this column/)).toHaveCount(
      0,
    );

    await deleteDatasetViaDataManagerUiAndVerify({
      admin,
      datasetId,
      page,
      workspaceId: await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      }),
      workspaceSlug,
    });
  });
});
