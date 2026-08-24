import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { installFakeGooglePicker } from "./helpers/installFakeGooglePicker";
import { parseDatasetIdFromDataManagerUrl } from "./helpers/manualUploadCloudSyncFlow";
import {
  removeGoogleTokens,
  seedGoogleToken,
} from "./helpers/seedGoogleToken";
import {
  createSupabaseAdminClient,
  deleteAllDatasetsInWorkspaceForE2E,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page, Route } from "@playwright/test";

/**
 * The Google Sheets connector, end to end: the stored Google token, the Drive
 * export, DuckDB's read of the exported workbook, and the import form the rows
 * land in.
 *
 * Only the Picker itself is stubbed (see `installFakeGooglePicker` for why it
 * has to be). The token comes from the real `google-auth/tokens` route, the
 * export is a real Drive request built by the real client, and the parse is
 * real DuckDB-WASM in the real browser.
 */

const FIXTURE_PATH = path.join(
  process.cwd(),
  "tests/data/google-sheet-late-prose/google-sheet-late-prose.xlsx",
);

const FIXTURE_SHEET = {
  id: "1FixtureSheetIdAbCdEfGhIjKlMnOpQrSt",
  name: "gender-stats-series",
};

/**
 * Every data row on the fixture's first tab: 700 numeric rows plus the prose
 * row. Kept in step with `tests/data/google-sheet-late-prose/makeFixture.mjs`.
 */
const FIXTURE_TOTAL_ROW_COUNT = 701;

/** A Drive file id that only the real-Drive test uses. */
const REAL_SHEET_ID = process.env.E2E_GOOGLE_SHEET_ID;
const REAL_REFRESH_TOKEN = process.env.E2E_GOOGLE_REFRESH_TOKEN;

type DriveRequestLog = { urls: string[] };

/** Matches the dataset detail URL a completed save lands on. */
function datasetMetaUrlPattern(workspaceSlug: string): RegExp {
  const escaped = workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`/${escaped}/data-manager/[0-9a-f-]{36}`, "i");
}

/**
 * Answers Drive out of the local fixture and records what was asked for.
 *
 * One handler for both endpoints rather than two patterns, so the order
 * Playwright resolves overlapping routes in cannot change which one wins.
 */
async function stubDriveExport(page: Page): Promise<DriveRequestLog> {
  const log: DriveRequestLog = { urls: [] };
  const workbookBytes = readFileSync(FIXTURE_PATH);

  await page.route("**/drive/v3/files/**", async (route: Route) => {
    const url = route.request().url();
    log.urls.push(url);

    if (url.includes("fields=version")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: "7" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: workbookBytes,
    });
  });

  return log;
}

/** Opens the Connectors tab and picks a sheet through the stubbed Picker. */
async function pickSheetInConnectorsTab(
  page: Page,
  workspaceSlug: string,
): Promise<void> {
  await page.goto(`/${workspaceSlug}/data-manager/data-import`);
  await page.getByRole("tab", { name: "Connectors" }).click();

  const pickButton = page.getByRole("button", {
    name: /pick google sheet/i,
  });
  await expect(pickButton).toBeVisible({ timeout: LONG_WAIT });
  await pickButton.click();
}

/**
 * Asserts the import form has rendered the workbook's rows.
 *
 * That the form renders at all is one of the assertions: the rows come from the
 * sniff, and a version that queried the not-yet-materialized table for them
 * left this panel empty behind a "parsed N rows" success notification.
 *
 * Deliberately **not** asserted here: the prose cell. It is the last row of 701
 * and the preview shows only the first handful, so its absence from this grid
 * says nothing. The transcode that used to choke on it is covered after the
 * save instead, by the parquet.
 */
async function expectImportedPreview(
  page: Page,
  expectedDatasetName: string,
): Promise<void> {
  await expect(
    page.getByText("These are the first", { exact: false }),
  ).toBeVisible({ timeout: LONG_WAIT });

  // The picked sheet's name, not the "Google Sheet" placeholder: the export
  // mutation used to read it from state it could not see yet.
  await expect(page.getByLabel("Dataset name")).toHaveValue(
    expectedDatasetName,
    { timeout: SHORT_WAIT },
  );

  await expect(
    page.getByRole("columnheader", { name: "indicator_value" }),
  ).toBeVisible({ timeout: SHORT_WAIT });
}

test.describe("Google Sheets connector", () => {
  // Datasets first, tokens second. `datasets__google_sheets.google_account_id`
  // is a foreign key onto `tokens__google`, so dropping the token while an
  // imported sheet still references it fails the constraint.
  test.afterEach(async ({ e2eWorkerDb }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    await deleteAllDatasetsInWorkspaceForE2E({
      supabaseAdminClient: admin,
      workspaceId,
    });
    await removeGoogleTokens(e2eWorkerDb.primaryUser.email);
  });

  // A fresh browser process: the workbook is small, but the parse is
  // DuckDB-WASM and this spec runs late enough in the suite to inherit the
  // shared process's accumulated pressure (see `freshBrowserPage`).
  test("imports a picked sheet, parsing a column that turns into prose", async ({
    freshBrowserPage: page,
    e2eWorkerDb,
  }) => {
    // A future expiry, so `google-auth/tokens` returns this token untouched
    // instead of trying to refresh a fake one against Google.
    await seedGoogleToken({
      email: e2eWorkerDb.primaryUser.email,
      accessToken: "ya29.e2e-stubbed-access-token",
      refreshToken: "1//e2e-stubbed-refresh-token",
      expiryDate: new Date(Date.now() + 60 * 60 * 1000),
    });
    await installFakeGooglePicker(page, FIXTURE_SHEET);
    const driveLog = await stubDriveExport(page);

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    await pickSheetInConnectorsTab(page, e2eWorkerDb.workspaceSlug);

    await expect(
      page.getByText(`Selected document: ${FIXTURE_SHEET.name}`),
    ).toBeVisible({ timeout: LONG_WAIT });

    await expectImportedPreview(page, FIXTURE_SHEET.name);

    // Both Drive calls must declare shared drive support. Without it Drive
    // answers 404 `notFound` for any file that lives in a shared drive, which
    // the client can only read as a withdrawn per-file grant.
    expect(driveLog.urls.length).toBeGreaterThanOrEqual(2);
    driveLog.urls.forEach((url) => {
      expect(url).toContain("supportsAllDrives=true");
    });

    // Saving is what makes this cover the transcode: the parquet uploaded here
    // is the output of the `read_xlsx` that used to abort on the prose cell in
    // row 702. No parquet, no upload, and this poll never turns true.
    //
    // Saved directly rather than through the shared cloud-sync save helper,
    // which first looks for the offline-only checkbox. A `google_sheets` source
    // has nowhere offline to live (see `DatasetSource.canBeOfflineOnly`), so
    // that control is deliberately absent here and the dataset is always
    // cloud-stored.
    await page.getByRole("button", { name: "Save Dataset" }).click();
    await expect
      .poll(
        () => {
          return datasetMetaUrlPattern(e2eWorkerDb.workspaceSlug).test(
            page.url(),
          );
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);

    const datasetId = parseDatasetIdFromDataManagerUrl({
      url: page.url(),
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    if (!datasetId) {
      throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
    }

    expect(datasetId).toBeTruthy();

    // The summary's row count is read with `COUNT(*)` over the transcoded
    // table, so it is only reachable if the transcode finished. All 701 rows,
    // not just the sniffed preview: an off-by-many here would mean the read
    // stopped early.
    await page.getByRole("tab", { name: "Data Summary" }).click();
    await expect
      .poll(
        async () => {
          const outline = await page
            .getByRole("navigation", { name: "Column outline" })
            .innerText();
          const match = outline.match(/(\d[\d,]*) rows/i);
          return match?.[1] ? Number(match[1].replaceAll(",", "")) : 0;
        },
        { timeout: LONG_WAIT },
      )
      .toBe(FIXTURE_TOTAL_ROW_COUNT);
  });

  // Opt-in, and skipped by default: it needs a Google account whose refresh
  // token is in the environment and which has already granted this app
  // per-file access to `E2E_GOOGLE_SHEET_ID` through the Picker once. See
  // `docs/google-sheets-e2e.md` for how to produce both.
  test("imports from the real Drive API", async ({
    freshBrowserPage: page,
    e2eWorkerDb,
  }) => {
    test.skip(
      !REAL_REFRESH_TOKEN || !REAL_SHEET_ID,
      "Set E2E_GOOGLE_REFRESH_TOKEN and E2E_GOOGLE_SHEET_ID to run this.",
    );

    // A past expiry on purpose: it makes `google-auth/tokens` refresh against
    // Google before answering, so the refresh path is covered too and no
    // access token has to be stored anywhere.
    await seedGoogleToken({
      email: e2eWorkerDb.primaryUser.email,
      accessToken: "ya29.expired-placeholder",
      refreshToken: REAL_REFRESH_TOKEN!,
      expiryDate: new Date(Date.now() - 60 * 1000),
      googleEmail: process.env.E2E_GOOGLE_EMAIL ?? "e2e@example.com",
    });
    await installFakeGooglePicker(page, {
      id: REAL_SHEET_ID!,
      name: process.env.E2E_GOOGLE_SHEET_NAME ?? "e2e-google-sheet",
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    await pickSheetInConnectorsTab(page, e2eWorkerDb.workspaceSlug);

    // No cell assertion here: the sheet's contents are not this repo's to
    // pin. That the preview rendered at all means Drive answered, the export
    // parsed, and the rows reached the form.
    await expect(
      page.getByText("These are the first", { exact: false }),
    ).toBeVisible({ timeout: LONG_WAIT });
  });
});
