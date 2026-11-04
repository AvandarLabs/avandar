/*
 * The Data Explorer's built-in `status` column, end to end: a case type
 * grouped by status counts its records per status, and a status changed on
 * the record page moves a record from one count to the other.
 *
 * The case type reads its one attribute from a real dataset, because only a
 * dataset-backed attribute has a value to count. The dataset is imported and
 * the case type seeded in `beforeAll`, in a browser context of its own: the
 * case type list is cached for minutes once a session loads it, so the session
 * under test has to start after the case type exists.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CaseTypeSeedHelpers } from "./helpers/CaseTypeSeedHelpers";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
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
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { SeededCaseType } from "./helpers/CaseTypeSeedHelpers";
import type { Page } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

const CASE_TYPE_NAME = "E2E county cases";
const KEY_COLUMN_NAME = "Admin2";
const KEY_ATTRIBUTE_NAME = "County";
const RECORD_KEYS = ["Alameda", "Alpine", "Amador"] as const;
const CHANGED_RECORD_KEY = "Alameda";
const COUNT_COLUMN_NAME = `count(${KEY_ATTRIBUTE_NAME})`;

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

/**
 * The grouped result as `{ <status>: <count> }`. The grid renders every number
 * with two decimals, so each count is compared as a number.
 */
async function _readStatusCounts(page: Page): Promise<Record<string, number>> {
  const [statuses, counts] = await Promise.all([
    _getColumnCellTexts({ page, columnName: "status" }),
    _getColumnCellTexts({ page, columnName: COUNT_COLUMN_NAME }),
  ]);
  return Object.fromEntries(
    statuses.map((status, index) => {
      return [status, Number(counts[index])];
    }),
  );
}

async function _chooseAggregation(options: {
  page: Page;
  columnName: string;
  aggregationLabel: string;
}): Promise<void> {
  const queryPanel = options.page.getByRole("tabpanel", { name: /^query$/i });
  await queryPanel
    .getByRole("combobox", { name: options.columnName, exact: true })
    .click();
  await options.page
    .getByRole("option", { name: options.aggregationLabel, exact: true })
    .click();
}

/**
 * Builds "count of County, grouped by status" over the case type in the
 * manual query form.
 */
async function _groupCaseTypeByStatus(page: Page): Promise<void> {
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
  await columnsInput.fill(KEY_ATTRIBUTE_NAME);
  await page
    .getByRole("option", { name: KEY_ATTRIBUTE_NAME, exact: true })
    .click();
  await columnsInput.fill("status");
  await page.getByRole("option", { name: "status", exact: true }).click();
  await page.keyboard.press("Escape");

  await _chooseAggregation({
    page,
    columnName: "status",
    aggregationLabel: "Group by",
  });
  await _chooseAggregation({
    page,
    columnName: KEY_ATTRIBUTE_NAME,
    aggregationLabel: "Count",
  });
}

/** Opens one record from the sidebar and sets its status on the record page. */
async function _setRecordStatus(options: {
  page: Page;
  recordKey: string;
  statusName: string;
}): Promise<void> {
  const { page } = options;
  await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
  // Each row's link names the record after its status dot, and the record
  // page's status control is a menu button named "Status: <current status>".
  // Both match `case-statuses-record.spec.ts`.
  await page
    .getByRole("link", { name: new RegExp(`${options.recordKey}$`) })
    .click();
  await page.getByRole("button", { name: /^Status: / }).click();
  await page
    .getByRole("menuitem", { name: options.statusName, exact: true })
    .click();
}

/** Oracle read: the record's saved status id. */
async function _readRecordStatusId(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  conceptId: string;
  externalId: string;
}): Promise<string> {
  const { data } = await options.supabaseAdminClient
    .from("individuals")
    .select("status_id")
    .eq("concept_id", options.conceptId)
    .eq("external_id", options.externalId)
    .single()
    .throwOnError();
  return data.status_id;
}

test.describe("Data Explorer status column", () => {
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
      // Waits for the cloud copy: the session under test has no local one.
      await importDatasetViaUi({
        page,
        filePath: SMALL_CALIFORNIA_CSV_PATH,
        expectedRowCount: SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug,
        onDatasetCreated: (datasetId) => {
          seededWorld.datasetId = datasetId;
        },
      });
    } finally {
      await context.close();
    }

    if (!seededWorld.datasetId) {
      throw new Error("The county dataset was not created.");
    }
    seededWorld.caseType = await CaseTypeSeedHelpers.seedCaseTypeOverDataset({
      supabaseAdminClient: admin,
      workspaceId: seededWorld.workspaceId,
      caseTypeName: CASE_TYPE_NAME,
      datasetId: seededWorld.datasetId,
      keyColumnName: KEY_COLUMN_NAME,
      keyAttributeName: KEY_ATTRIBUTE_NAME,
      recordKeys: RECORD_KEYS,
    });
  });

  // Removes the case type (with its statuses, records, and the status the
  // test changed) and the dataset, whatever the test did.
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

  test("a status changed on the record page moves the record between the grouped status counts", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { caseType } = seededWorld;
    if (!caseType) {
      throw new Error("beforeAll did not seed the case type.");
    }

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await _groupCaseTypeByStatus(page);
    await expect
      .poll(
        async () => {
          return _readStatusCounts(page);
        },
        { timeout: MEDIUM_WAIT },
      )
      .toEqual({ Active: 3 });

    await _setRecordStatus({
      page,
      recordKey: CHANGED_RECORD_KEY,
      statusName: "Inactive",
    });
    // The explorer can only see a saved change, so wait for the save itself.
    await expect
      .poll(
        async () => {
          return _readRecordStatusId({
            supabaseAdminClient: admin,
            conceptId: caseType.conceptId,
            externalId: CHANGED_RECORD_KEY,
          });
        },
        { timeout: MEDIUM_WAIT },
      )
      .toBe(caseType.statusIdsByName.Inactive);

    // The explorer keeps its query across routes; the status change
    // invalidated its result, so returning re-runs the same grouping.
    await page
      .getByRole("link", { name: "Data Explorer", exact: true })
      .click();
    await expect
      .poll(
        async () => {
          return _readStatusCounts(page);
        },
        { timeout: MEDIUM_WAIT },
      )
      .toEqual({ Active: 2, Inactive: 1 });
  });
});
