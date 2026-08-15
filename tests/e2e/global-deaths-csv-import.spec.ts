import path from "node:path";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { formatImportPreviewRowCount } from "./helpers/constants";
import { deleteDatasetViaDataManagerUiAndVerify } from "./helpers/deleteDatasetViaDataManagerUi";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

/** Quotes appear only after the first 20_480-byte DuckDB sniff window. */
const GLOBAL_DEATHS_LATE_QUOTES_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/global-deaths-late-quotes/global-deaths-late-quotes.csv",
);

/**
 * Same late-quote pattern as the full file; small enough to round-trip
 * through upload + cloud sync in e2e.
 */
const GLOBAL_DEATHS_SNIFF_MISSES_QUOTES_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/global-deaths-sniff-misses-quotes/global-deaths-sniff-misses-quotes.csv",
);

/** Rows in global-deaths-sniff-misses-quotes.csv (may reject 1–2). */
const SNIFF_MISSES_MIN_ROW_COUNT = 499;

const LATE_QUOTES_EXPECTED_ROW_COUNT = 601;

async function _openCsvPreview(
  options: Readonly<{
    csvPath: string;
    page: Page;
    workspaceSlug: string;
  }>,
): Promise<void> {
  const { csvPath, page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel.locator('input[type="file"]').setInputFiles(csvPath);
  await uploadPanel
    .getByRole("button", { name: "Upload", exact: true })
    .click();
}

async function _assertSummaryRowCount(page: Page): Promise<void> {
  await page.getByRole("tab", { name: "Data Summary" }).click();
  await expect
    .poll(
      async () => {
        const outlineText = await page
          .getByRole("navigation", { name: "Column outline" })
          .innerText();
        const match = outlineText.match(/(\d[\d,]*) rows/i);
        return match?.[1] ? Number(match[1].replaceAll(",", "")) : 0;
      },
      { timeout: LONG_WAIT },
    )
    .toBeGreaterThanOrEqual(SNIFF_MISSES_MIN_ROW_COUNT);
}

async function _deleteDatasetIfOnDetailPage(
  options: Readonly<{
    admin: ReturnType<typeof createSupabaseAdminClient>;
    page: Page;
    workspaceSlug: string;
  }>,
): Promise<void> {
  const { admin, page, workspaceSlug } = options;
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (datasetId === undefined) {
    return;
  }
  const workspaceId = await getWorkspaceIdBySlug({
    supabaseAdminClient: admin,
    slug: workspaceSlug,
  });
  await deleteDatasetViaDataManagerUiAndVerify({
    admin,
    datasetId,
    page,
    workspaceId,
    workspaceSlug,
  });
}

test.describe("CSV with quoted fields after sniff sample", () => {
  test("import preview shows non-empty Country/Region cells (fixture)", async ({
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

    await _openCsvPreview({
      csvPath: GLOBAL_DEATHS_LATE_QUOTES_CSV_PATH,
      page,
      workspaceSlug,
    });
    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: LONG_WAIT });

    await expect(
      page.getByText(
        `Parsed ${formatImportPreviewRowCount(LATE_QUOTES_EXPECTED_ROW_COUNT)} rows successfully`,
      ),
    ).toBeVisible({ timeout: LONG_WAIT });

    await expect(
      page.getByRole("columnheader", { name: "Country/Region" }),
    ).toBeVisible({ timeout: SHORT_WAIT });

    await expect(page.getByText("Afghanistan").first()).toBeVisible({
      timeout: SHORT_WAIT,
    });

    await _deleteDatasetIfOnDetailPage({
      admin,
      page,
      workspaceSlug,
    });
  });

  test("saved late-quote CSV preview survives upload and cloud sync", async ({
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

    await _openCsvPreview({
      csvPath: GLOBAL_DEATHS_SNIFF_MISSES_QUOTES_CSV_PATH,
      page,
      workspaceSlug,
    });
    await expect(page.getByText("Afghanistan").first()).toBeVisible({
      timeout: LONG_WAIT,
    });

    await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });

    await expect(page.getByText("Dataset ready", { exact: false })).toBeVisible(
      {
        timeout: LONG_WAIT,
      },
    );

    await expect(page.getByText("Afghanistan").first()).toBeVisible({
      timeout: LONG_WAIT,
    });

    await _assertSummaryRowCount(page);
    await _deleteDatasetIfOnDetailPage({
      admin,
      page,
      workspaceSlug,
    });
  });
});
