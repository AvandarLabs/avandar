import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  COUNTRY_TAB_TITLE,
  FIXTURE_PATH,
  SERIES_TAB_TITLE,
  TOTAL_ROW_COUNT,
} from "../data/google-sheet-late-prose/makeFixture";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { installFakeGooglePicker } from "./helpers/installFakeGooglePicker";
import { parseDatasetIdFromDataManagerUrl } from "./helpers/manualUploadCloudSyncFlow";
import { removeGoogleTokens, seedGoogleToken } from "./helpers/seedGoogleToken";
import {
  createSupabaseAdminClient,
  deleteAllDatasetsInWorkspaceForE2E,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import {
  E2E_THIRD_PARTY_TAG,
  E2eThirdPartyMode,
} from "./setup/E2eThirdPartyMode/E2eThirdPartyMode";
import type { Page, Route } from "@playwright/test";

/**
 * The Google Sheets connector, end to end: the stored Google token, the tab
 * list, the per-tab CSV download, DuckDB's read of it, and the import form the
 * rows land in.
 *
 * Only the Picker itself is stubbed (see `installFakeGooglePicker` for why it
 * has to be). The token comes from the real `google-auth/tokens` route, the
 * requests are built by the real client, and the parse is real DuckDB-WASM in
 * the real browser.
 */

const FIXTURE_SHEET = {
  id: "1FixtureSheetIdAbCdEfGhIjKlMnOpQrSt",
  name: "gender-stats-series",
};

/**
 * The fixture workbook's tabs, with the gids this stub answers to.
 *
 * The titles come from the generator, so a renamed tab breaks the stub here
 * rather than in a download that quietly returns the wrong rows. The gids are
 * this stub's own invention: the fixture is a local workbook and has none.
 *
 * Two of them, so the connector has to ask which one to import and the answer
 * has to reach the download. The first is the one with the prose row.
 */
const FIXTURE_TABS = [
  { sheetId: 0, title: SERIES_TAB_TITLE, index: 0 },
  { sheetId: 1234567, title: COUNTRY_TAB_TITLE, index: 1 },
];

type DriveRequestLog = { urls: string[] };

/** Matches the dataset detail URL a completed save lands on. */
function _datasetMetaUrlPattern(workspaceSlug: string): RegExp {
  const escaped = workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`/${escaped}/data-manager/[0-9a-f-]{36}`, "i");
}

/**
 * Answers Google out of the local fixture and records what was asked for.
 *
 * Three endpoints, because the connector uses three: Drive for the file
 * version, the Sheets API for the tab list, and the per-tab CSV export for the
 * cells. The workbook fixture is converted to CSV here, so the rows the browser
 * parses are the fixture's own rather than a second hand-written copy.
 */
async function _stubGoogleSheet(page: Page): Promise<DriveRequestLog> {
  const log: DriveRequestLog = { urls: [] };
  const workbook = XLSX.read(readFileSync(FIXTURE_PATH), { type: "buffer" });
  const csvByGid = new Map(
    FIXTURE_TABS.map((tab) => {
      const worksheet = workbook.Sheets[workbook.SheetNames[tab.index]!]!;
      // CRLF, because that is what Google's CSV export returns. An LF fixture
      // hid a hang in the CSV reader that every real import walked into.
      return [
        String(tab.sheetId),
        XLSX.utils.sheet_to_csv(worksheet).replaceAll("\n", "\r\n"),
      ];
    }),
  );
  // PROBE: the exact bytes Google returns, CRLF and no trailing newline.
  csvByGid.set(
    String(FIXTURE_TABS[1]!.sheetId),
    "country,indicator_value\r\nKenya,41\r\nPeru,57\r\nNepal,22",
  );

  await page.route("**/drive/v3/files/**", async (route: Route) => {
    log.urls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: "7" }),
    });
  });

  await page.route(
    "**/sheets.googleapis.com/v4/spreadsheets/**",
    async (route: Route) => {
      log.urls.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sheets: FIXTURE_TABS.map((properties) => {
            return { properties };
          }),
        }),
      });
    },
  );

  await page.route(
    "**/docs.google.com/spreadsheets/**",
    async (route: Route) => {
      const url = route.request().url();
      log.urls.push(url);
      const gid = new URL(url).searchParams.get("gid") ?? "0";
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        body: csvByGid.get(gid) ?? "",
      });
    },
  );

  return log;
}

/** Chooses a tab in the pre-import selector and starts the import. */
async function _importTab(page: Page, tabTitle: string): Promise<void> {
  const tabSelect = page.getByRole("combobox", { name: "Tab to import" });
  await expect(tabSelect).toBeVisible({ timeout: LONG_WAIT });
  await tabSelect.click();
  await page.getByRole("option", { name: tabTitle, exact: true }).click();
  await page.getByRole("button", { name: "Process", exact: true }).click();
}

/** Opens the Connectors tab and picks a sheet through the stubbed Picker. */
async function _pickSheetInConnectorsTab(
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
 * says nothing. The transcode is what chokes on that cell, and it is covered
 * after the save instead, by the parquet.
 */
async function _expectImportedPreview(
  page: Page,
  expectedDatasetName: string,
): Promise<void> {
  await expect(
    page.getByText("These are the first", { exact: false }),
  ).toBeVisible({ timeout: LONG_WAIT });

  // The picked sheet's name, not the "Google Sheet" placeholder: a mutation
  // that reads the name from state cannot see the pick that created it.
  await expect(page.getByLabel("Dataset name")).toHaveValue(
    expectedDatasetName,
    { timeout: SHORT_WAIT },
  );

  await expect(
    page.getByRole("columnheader", { name: "indicator_value" }),
  ).toBeVisible({ timeout: SHORT_WAIT });
}

/**
 * Drops everything either test creates: the imported dataset and the token.
 *
 * Datasets first, tokens second. `datasets__google_sheets.google_account_id`
 * is a foreign key onto `tokens__google`, so dropping the token while an
 * imported sheet still references it fails the constraint.
 */
async function _cleanUpGoogleSheetImport(
  e2eWorkerDb: Readonly<{
    workspaceSlug: string;
    primaryUser: Readonly<{ email: string }>;
  }>,
): Promise<void> {
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
}

test.describe("Google Sheets connector", () => {
  test("imports a picked sheet, parsing a column that turns into prose", async ({
    page,
    e2eWorkerDb,
  }) => {
    try {
      // A future expiry, so `google-auth/tokens` returns this token untouched
      // instead of trying to refresh a fake one against Google.
      await seedGoogleToken({
        email: e2eWorkerDb.primaryUser.email,
        accessToken: "ya29.e2e-stubbed-access-token",
        refreshToken: "1//e2e-stubbed-refresh-token",
        expiryDate: new Date(Date.now() + 60 * 60 * 1000),
      });
      await installFakeGooglePicker(page, FIXTURE_SHEET);
      const googleLog = await _stubGoogleSheet(page);

      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await _pickSheetInConnectorsTab(page, e2eWorkerDb.workspaceSlug);

      await expect(
        page.getByText(`Selected document: ${FIXTURE_SHEET.name}`),
      ).toBeVisible({ timeout: LONG_WAIT });

      // Nothing is downloaded before the tab is chosen: the tab list is a
      // properties-only read, and one dataset is one tab.
      expect(
        googleLog.urls.some((url) => {
          return url.includes("docs.google.com");
        }),
      ).toBe(false);

      await _importTab(page, FIXTURE_TABS[0]!.title);

      await _expectImportedPreview(page, FIXTURE_SHEET.name);

      // The chosen tab's gid reaches the download rather than a default.
      expect(
        googleLog.urls.some((url) => {
          return url.includes(`gid=${FIXTURE_TABS[0]!.sheetId}`);
        }),
      ).toBe(true);

      // Every Drive call must declare shared drive support. Without it Drive
      // answers 404 `notFound` for any file that lives in a shared drive, which
      // the client can only read as a withdrawn per-file grant.
      const driveUrls = googleLog.urls.filter((url) => {
        return url.includes("/drive/v3/files/");
      });
      expect(driveUrls.length).toBeGreaterThanOrEqual(1);
      driveUrls.forEach((url) => {
        expect(url).toContain("supportsAllDrives=true");
      });

      // Saving is what makes this cover the transcode: the parquet uploaded
      // here is the output of the read that has to survive the prose cell in
      // row 702. No parquet, no upload, and this poll never turns true.
      //
      // Saved directly rather than through the shared cloud-sync save helper,
      // which first looks for the offline-only checkbox. A `google_sheets`
      // source has nowhere offline to live (see
      // `DatasetSource.canBeOfflineOnly`), so
      // that control is deliberately absent here and the dataset is always
      // cloud-stored.
      await page.getByRole("button", { name: "Save Dataset" }).click();
      await expect
        .poll(
          () => {
            return _datasetMetaUrlPattern(e2eWorkerDb.workspaceSlug).test(
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
        .toBe(TOTAL_ROW_COUNT);
    } finally {
      await _cleanUpGoogleSheetImport(e2eWorkerDb);
    }
  });

  // The one test here that leaves the machine. It needs a Google account whose
  // refresh token is in the environment and which has already granted this app
  // per-file access to `E2E_GOOGLE_SHEET_ID` through the Picker once. See
  // `docs/google-sheets-e2e.md` for how to produce both.
  //
  // It runs in a bare `pnpm test:e2e` and skips itself when those are absent,
  // so a machine without the credentials stays green. `pnpm
  // test:e2e:third-party` narrows the run to this test and makes the same
  // absence a failure.
  test(
    "imports from the real Drive API",
    { tag: E2E_THIRD_PARTY_TAG },
    async ({ page, e2eWorkerDb }) => {
      try {
        // Skips or fails depending on how the run was invoked, which is the
        // whole reason this goes through the helper rather than reading
        // `process.env` here.
        const {
          E2E_GOOGLE_SHEET_ID: realSheetId,
          E2E_GOOGLE_REFRESH_TOKEN: realRefreshToken,
        } = E2eThirdPartyMode.requireEnv({
          test,
          variableNames: ["E2E_GOOGLE_SHEET_ID", "E2E_GOOGLE_REFRESH_TOKEN"],
        });

        // A past expiry on purpose: it makes `google-auth/tokens` refresh
        // against Google before answering, so the refresh path is covered too
        // and no access token has to be stored anywhere.
        await seedGoogleToken({
          email: e2eWorkerDb.primaryUser.email,
          accessToken: "ya29.expired-placeholder",
          refreshToken: realRefreshToken,
          expiryDate: new Date(Date.now() - 60 * 1000),
          googleEmail: process.env.E2E_GOOGLE_EMAIL ?? "e2e@example.com",
        });
        await installFakeGooglePicker(page, {
          id: realSheetId,
          name: process.env.E2E_GOOGLE_SHEET_NAME ?? "e2e-google-sheet",
        });

        await signInWithEmailPassword(page, {
          email: e2eWorkerDb.primaryUser.email,
          password: e2eWorkerDb.primaryUser.password,
          workspaceSlug: e2eWorkerDb.workspaceSlug,
        });
        await _pickSheetInConnectorsTab(page, e2eWorkerDb.workspaceSlug);

        // The real fixture sheet has two tabs, so the connector asks. Choosing
        // the second one is what proves the gid reached Google: a download that
        // ignored it would return the first tab's columns.
        const secondTab = process.env.E2E_GOOGLE_SHEET_SECOND_TAB ?? "Cities";
        await _importTab(page, secondTab);

        // No cell assertion here: the sheet's contents are not this repo's
        // to pin. That the preview rendered at all means Google answered, the
        // CSV parsed, and the rows reached the form.
        await expect(
          page.getByText("These are the first", { exact: false }),
        ).toBeVisible({ timeout: LONG_WAIT });
      } finally {
        await _cleanUpGoogleSheetImport(e2eWorkerDb);
      }
    },
  );
});
