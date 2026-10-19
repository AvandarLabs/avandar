import { expect } from "@playwright/test";
import { importGoogleSheetTab } from "../importGoogleSheetTab";
import { installFakeGooglePicker } from "../installFakeGooglePicker";
import { saveCloudOnlyDataset } from "../saveCloudOnlyDataset";
import { removeGoogleTokens, seedGoogleToken } from "../seedGoogleToken";
import { deleteAllDatasetsInWorkspaceForE2E } from "../supabaseAdminClient";
import { LONG_WAIT } from "../timeouts";
import { LiveSourceTable } from "./LiveSourceTable";
import type { SavedDataset } from "../saveCloudOnlyDataset";
import type {
  LiveConnectorE2e,
  LiveConnectorInstallOptions,
  LiveConnectorSession,
  LiveSourceRow,
} from "./LiveConnectorE2e.types";
import type { Page } from "@playwright/test";

/**
 * Two tabs, so the import asks which one to read. The gids are this stub's
 * own: the first tab holds the source table, the second is never imported.
 */
const FIXTURE_TABS = [
  { sheetId: 0, title: "Cases", index: 0 },
  { sheetId: 1234567, title: "Notes", index: 1 },
] as const;

/**
 * The sheet's current rows and Drive version, and every dataset read its CSV
 * route saw.
 */
type SourceState = {
  rows: readonly LiveSourceRow[];
  version: number;
  datasetReadUrls: string[];
};

/**
 * Stubs the three Google endpoints the import calls from the browser: Drive
 * for the file version, the Sheets API for the tab list, and the per-tab CSV
 * export for the cells.
 */
async function _stubGoogleImportRoutes(
  options: Readonly<{ page: Page; source: SourceState }>,
): Promise<void> {
  const { page, source } = options;
  await page.route("**/drive/v3/files/**", async (route) => {
    await route.fulfill({ json: { version: String(source.version) } });
  });
  await page.route(
    "**/sheets.googleapis.com/v4/spreadsheets/**",
    async (route) => {
      await route.fulfill({
        json: {
          sheets: FIXTURE_TABS.map((properties) => {
            return { properties };
          }),
        },
      });
    },
  );
  await page.route("**/docs.google.com/spreadsheets/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/csv",
      body: LiveSourceTable.makeCsvFromRows(source.rows),
    });
  });
}

/**
 * Stubs the `google-sheets` edge function's dataset-keyed routes, which every
 * read after the import goes through. The real routes read the sheet with the
 * importer's Google grant on the server, where `page.route` cannot reach.
 */
async function _stubDatasetRoutes(
  options: Readonly<{ page: Page; source: SourceState }>,
): Promise<void> {
  const { page, source } = options;
  await page.route(
    "**/functions/v1/google-sheets/datasets/*/csv",
    async (route) => {
      source.datasetReadUrls.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        // The real route exposes the version header, or a cross-origin
        // browser could not read it.
        headers: {
          "Access-Control-Expose-Headers": "X-Ava-Source-Version",
          "X-Ava-Source-Version": String(source.version),
        },
        body: LiveSourceTable.makeCsvFromRows(source.rows),
      });
    },
  );
  await page.route(
    "**/functions/v1/google-sheets/datasets/*/version",
    async (route) => {
      await route.fulfill({
        json: { sourceVersion: String(source.version) },
      });
    },
  );
}

/**
 * Seeds a Google token for `email` that expires in an hour, so
 * `google-auth/tokens` returns it untouched instead of trying to refresh a
 * fake one against Google.
 */
async function _seedUnexpiredGoogleToken(email: string): Promise<void> {
  await seedGoogleToken({
    email,
    accessToken: "ya29.e2e-stubbed-access-token",
    refreshToken: "1//e2e-stubbed-refresh-token",
    expiryDate: new Date(Date.now() + 60 * 60 * 1000),
  });
}

/** Picks the sheet through the stubbed Picker, imports its tab, and saves. */
async function _importDataset(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<SavedDataset> {
  const { page, workspaceSlug } = options;
  await page.getByRole("link", { name: "Data Sources" }).click();
  await page.getByRole("button", { name: "Add new dataset" }).click();
  await page.getByRole("tab", { name: "Connectors" }).click();

  const pickButton = page.getByRole("button", { name: /pick a sheet/i });
  await expect(pickButton).toBeVisible({ timeout: LONG_WAIT });
  await pickButton.click();
  await importGoogleSheetTab({ page, tabTitle: FIXTURE_TABS[0].title });
  await expect(
    page.getByRole("columnheader", { name: "reported_on" }),
  ).toBeVisible({ timeout: LONG_WAIT });

  return await saveCloudOnlyDataset({ page, workspaceSlug });
}

async function _install(
  options: Readonly<LiveConnectorInstallOptions>,
): Promise<LiveConnectorSession> {
  const { supabaseAdminClient, e2eWorkerDb, page, workspaceId } = options;
  const source: SourceState = {
    rows: LiveSourceTable.initialRows,
    version: 1,
    datasetReadUrls: [],
  };
  await _seedUnexpiredGoogleToken(e2eWorkerDb.primaryUser.email);
  await installFakeGooglePicker(page, {
    id: "1LiveConnectorSheetIdAbCdEfGhIjKlMnOp",
    name: "e2e-live-case-counts",
  });
  await _stubGoogleImportRoutes({ page, source });
  await _stubDatasetRoutes({ page, source });

  return {
    importDataset: (importPage) => {
      return _importDataset({
        page: importPage,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
    },
    setSourceRows: (rows) => {
      source.rows = rows;
      source.version += 1;
    },
    getDatasetReadUrls: () => {
      return [...source.datasetReadUrls];
    },
    cleanUp: async () => {
      // Datasets first: `datasets__google_sheets.google_account_id` is a
      // foreign key onto the token row.
      await deleteAllDatasetsInWorkspaceForE2E({
        supabaseAdminClient,
        workspaceId,
      });
      await removeGoogleTokens(e2eWorkerDb.primaryUser.email);
    },
  };
}

/** The Google Sheets connector, imported through the Picker. */
export const googleSheetsLiveConnectorE2e: LiveConnectorE2e = {
  refreshMenuItemName: "Refresh from Google Sheets",
  refreshedNotificationTitle: "Refreshed from Google Sheets",
  install: _install,
};
