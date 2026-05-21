import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { formatImportPreviewRowCount } from "./helpers/constants";
import { deleteDatasetViaDataManagerUiAndVerify } from "./helpers/deleteDatasetViaDataManagerUi";
import { dismissBillingModalIfVisible } from "./helpers/dismissBillingModal";
import { dismissDatasetLimitModalIfVisible } from "./helpers/dismissDatasetLimitModal";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  deleteAllDatasetsInWorkspaceForE2E,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";

/** Quotes appear only after the first 20_480-byte DuckDB sniff window. */
const GLOBAL_DEATHS_LATE_QUOTES_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/global-deaths-late-quotes.csv",
);

/** Same late-quote pattern as the full file; small enough for Phase B e2e. */
const GLOBAL_DEATHS_SNIFF_MISSES_QUOTES_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/global-deaths-sniff-misses-quotes.csv",
);

/** Rows in global-deaths-sniff-misses-quotes.csv (may reject 1–2). */
const SNIFF_MISSES_MIN_ROW_COUNT = 499;

const FULL_GLOBAL_DEATHS_CSV_PATH =
  "/Users/juanpablosarmiento/Documents/2.Areas/Avandar Test Data/Cleaned Test Data/LONG_global_deaths.csv";

const LATE_QUOTES_EXPECTED_ROW_COUNT = 601;

/** Full file has 330_327 data rows; preview caps at 200. */
const FULL_GLOBAL_DEATHS_PREVIEW_ROW_COUNT = 200;

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

    await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
      waitUntil: "domcontentloaded",
    });

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(GLOBAL_DEATHS_LATE_QUOTES_CSV_PATH);

    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

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

  test("LONG_global_deaths.csv preview shows Afghanistan data", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    test.skip(
      !existsSync(FULL_GLOBAL_DEATHS_CSV_PATH),
      `Missing ${FULL_GLOBAL_DEATHS_CSV_PATH}`,
    );

    const admin = createSupabaseAdminClient();
    const ict4dWorkspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: "ict4d",
    });
    await deleteAllDatasetsInWorkspaceForE2E({
      supabaseAdminClient: admin,
      workspaceId: ict4dWorkspaceId,
    });

    await signInWithEmailPassword(page, {
      email: "user@avandarlabs.com",
      password: "avandar",
      workspaceSlug: "ict4d",
    });

    await page.goto("/ict4d/data-manager/data-import", {
      waitUntil: "domcontentloaded",
    });
    await dismissBillingModalIfVisible(page);
    await dismissDatasetLimitModalIfVisible(page);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(FULL_GLOBAL_DEATHS_CSV_PATH);

    await dismissBillingModalIfVisible(page);
    await dismissDatasetLimitModalIfVisible(page);

    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: LONG_WAIT });

    await expect(
      page.getByText(
        `Parsed ${formatImportPreviewRowCount(FULL_GLOBAL_DEATHS_PREVIEW_ROW_COUNT)} rows successfully`,
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
      workspaceSlug: "ict4d",
    });
  });

  test("saved late-quote CSV serves non-empty preview after Phase B", async ({
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

    await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
      waitUntil: "domcontentloaded",
    });

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(GLOBAL_DEATHS_SNIFF_MISSES_QUOTES_CSV_PATH);

    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

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

    await _deleteDatasetIfOnDetailPage({
      admin,
      page,
      workspaceSlug,
    });
  });
});

async function _deleteDatasetIfOnDetailPage(options: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  page: import("@playwright/test").Page;
  workspaceSlug: string;
}): Promise<void> {
  const { admin, page, workspaceSlug } = options;
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });

  if (!datasetId) {
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
