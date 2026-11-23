/*
 * A per-month field, end to end: a case type whose Temperature field keeps
 * each month's average shows one row per month on the record page, and the
 * same months and averages in the Data Explorer.
 *
 * The visits dataset is imported and the case type seeded in `beforeAll`, in
 * a browser context of its own: the case type list is cached for minutes once
 * a session loads it, so the session under test has to start after the case
 * type exists. The rows hold an empty temperature, a visit with no date, and
 * a month whose only temperature is empty, so a month or a value that should
 * not exist would show.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CaseTypeSeedHelpers } from "./helpers/CaseTypeSeedHelpers";
import {
  CASE_BUCKETED_VISITS_CSV_EXPECTED_ROW_COUNT,
  CASE_BUCKETED_VISITS_CSV_PATH,
} from "./helpers/constants";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { SeededCaseType } from "./helpers/CaseTypeSeedHelpers";
import type { Page } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

const CASE_TYPE_NAME = "E2E patient visits";
const KEY_ATTRIBUTE_NAME = "Patient";
const FIELD_NAME = "Temperature";

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
  caseType: SeededCaseType | undefined;
} = { workspaceId: undefined, datasetId: undefined, caseType: undefined };

/** Every value rendered in one column of the results grid. */
async function _getColumnCellTexts(options: {
  page: Page;
  columnName: string;
}): Promise<string[]> {
  const { page, columnName } = options;
  const header = page.getByRole("columnheader", {
    name: columnName,
    exact: true,
  });
  const columnIndex = await header.evaluate((element) => {
    return Number(element.getAttribute("aria-colindex") ?? "0");
  });
  return page
    .locator(`[role="gridcell"][aria-colindex="${columnIndex}"]`)
    .allInnerTexts();
}

/** Selects the case type's patient and temperature in the query form. */
async function _queryPatientTemperatures(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Data Explorer", exact: true }).click();
  await dismissBlockingOverlays(page);
  await openDataExplorerDrawerTab({ page, tab: "query" });

  const queryPanel = page.getByRole("tabpanel", { name: /^query$/i });
  const dataSourceInput = queryPanel.getByRole("combobox", {
    name: "Data source",
    exact: true,
  });
  await expect(dataSourceInput).toBeEnabled({ timeout: MEDIUM_WAIT });
  await dataSourceInput.click();
  await page.getByRole("option", { name: CASE_TYPE_NAME, exact: true }).click();

  const columnsInput = queryPanel.getByPlaceholder("Select columns to query");
  for (const columnName of [KEY_ATTRIBUTE_NAME, FIELD_NAME]) {
    await columnsInput.fill(columnName);
    await page.getByRole("option", { name: columnName, exact: true }).click();
  }
  await page.keyboard.press("Escape");
}

test.describe("Per-month case type fields", () => {
  test.beforeAll(async ({ browser, e2eWorkerDb }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    seededWorld.workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      reducedMotion: "reduce",
    });
    await installDuckDbExtensionCache(context);
    try {
      const page = await context.newPage();
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await importDatasetViaUi({
        page,
        filePath: CASE_BUCKETED_VISITS_CSV_PATH,
        expectedRowCount: CASE_BUCKETED_VISITS_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug,
        onDatasetCreated: (datasetId) => {
          seededWorld.datasetId = datasetId;
        },
      });
    } finally {
      await context.close();
    }

    if (!seededWorld.datasetId) {
      throw new Error("The visits dataset was not created.");
    }
    // The trigger refuses a date column the import did not type as a date,
    // so a sniffing change fails here, not as an empty table later.
    seededWorld.caseType =
      await CaseTypeSeedHelpers.seedCaseTypeWithPerMonthField({
        supabaseAdminClient: admin,
        workspaceId: seededWorld.workspaceId,
        caseTypeName: CASE_TYPE_NAME,
        datasetId: seededWorld.datasetId,
        keyColumnName: "patient_id",
        keyAttributeName: KEY_ATTRIBUTE_NAME,
        valueColumnName: "temperature",
        fieldName: FIELD_NAME,
        dateColumnName: "visit_date",
        recordKeys: ["p-001", "p-002"],
      });
  });

  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    if (seededWorld.caseType) {
      await CaseTypeSeedHelpers.deleteCaseType({
        supabaseAdminClient: admin,
        conceptId: seededWorld.caseType.conceptId,
      });
    }
    if (seededWorld.datasetId && seededWorld.workspaceId) {
      await deleteDatasetFixture({
        admin,
        datasetId: seededWorld.datasetId,
        workspaceId: seededWorld.workspaceId,
      });
    }
  });

  test("shows each month's average temperature as one row per month on the record page", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
    // Each row's link names the record after its status dot.
    await page.getByRole("link", { name: /p-001$/ }).click();

    const table = page.getByRole("table", { name: `${FIELD_NAME} per month` });
    await expect(table.getByRole("row")).toHaveText(
      [/Month\s*Value/, /Jan 2026\s*38\.5/, /Feb 2026\s*37\.9/],
      { timeout: MEDIUM_WAIT },
    );
  });

  test("shows the same months and averages in the Data Explorer", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await _queryPatientTemperatures(page);

    await expect
      .poll(
        async () => {
          return (
            await _getColumnCellTexts({ page, columnName: FIELD_NAME })
          ).sort();
        },
        { timeout: MEDIUM_WAIT },
      )
      .toEqual(["Jan 2026: 37", "Jan 2026: 38.5; Feb 2026: 37.9"]);
  });
});
