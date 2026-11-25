/*
 * The epidemiology plugin's cases data slot, end to end: an admin binds it to
 * a case type in the install wizard, and the Case epicurve command then
 * charts that case type's records by onset week, stacked by district on
 * request.
 *
 * The line list is imported and the case type seeded in `beforeAll`, in a
 * browser context of its own: the case type list is cached for minutes once
 * a session loads it, so the session under test has to start after the case
 * type exists. See `CASE_LINE_LIST_CSV_PATH` for the counts the chart shows.
 */
import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CaseTypeSeedHelpers } from "./helpers/CaseTypeSeedHelpers";
import {
  CASE_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
  CASE_LINE_LIST_CSV_PATH,
} from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  getPluginCard,
  installPluginThroughWizard,
  runPluginCommand,
} from "./helpers/pluginFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { E2EWorkerCredentials } from "./fixtures/e2e.fixture";
import type { SeededCaseType } from "./helpers/CaseTypeSeedHelpers";
import type { Browser, Locator, Page } from "@playwright/test";

const PLUGIN_ID = "avandar.epidemiology";
const PLUGIN_NAME = "Epidemiology";
/**
 * The seeded case type's name. The per-run suffix keeps a case type leaked by
 * an earlier failed run from putting two options of the same name in the
 * wizard's picker.
 */
const CASE_TYPE_NAME = `E2E plugin cases ${randomUUID().slice(0, 8)}`;

/** The line list's case ids, `C001` to `C030`, one record each. */
const CASE_IDS = Array.from(
  { length: CASE_LINE_LIST_CSV_EXPECTED_ROW_COUNT },
  (_value, index) => {
    return `C${String(index + 1).padStart(3, "0")}`;
  },
);

/** The line list's MMWR weeks, each with at least one case. */
const EPI_WEEK_COUNT = 4;

/**
 * The line list's districts in the order the chart's legend lists them,
 * which is alphabetical.
 */
const DISTRICTS = ["Ilala", "Kinondoni", "Temeke"];

/**
 * Two number columns turn on Linear regression and Incidence per 100k as
 * well, so the toolbar's three epidemiology commands collapse into the
 * Plugins menu.
 */
const RESULT_SQL = "SELECT 1 AS first_number, 2 AS second_number";

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
  caseType: SeededCaseType | undefined;
} = { workspaceId: undefined, datasetId: undefined, caseType: undefined };

/** The bars a Recharts bar chart draws. */
function _getBars(scope: Locator): Locator {
  return scope.locator(".recharts-bar-rectangle path");
}

/** Picks an option in one of the wizard's pickers. */
async function _pickOption(
  options: Readonly<{
    page: Page;
    wizard: Locator;
    pickerName: string;
    optionName: string;
  }>,
): Promise<void> {
  const { page, wizard, pickerName, optionName } = options;
  await wizard
    .getByRole("combobox", { name: pickerName, exact: true })
    .click({ timeout: MEDIUM_WAIT });
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

/**
 * Binds the cases slot to the seeded case type on the wizard's Records page
 * and waits for the check to count every record.
 */
async function _chooseCaseRecords(
  options: Readonly<{ page: Page; wizard: Locator }>,
): Promise<void> {
  const { page, wizard } = options;
  await _pickOption({
    page,
    wizard,
    pickerName: "Case type or dataset",
    optionName: CASE_TYPE_NAME,
  });
  await _pickOption({
    page,
    wizard,
    pickerName: "Onset date",
    optionName: "onset_date",
  });
  await _pickOption({
    page,
    wizard,
    pickerName: "District",
    optionName: "district",
  });
  await expect(
    wizard.getByText(`${CASE_IDS.length} records`, { exact: true }),
  ).toBeVisible({ timeout: LONG_WAIT });
}

/**
 * Imports the line list through Data Sources in a browser context of its
 * own, recording the new dataset's id in `seededWorld` as soon as it exists.
 */
async function _importLineList(
  options: Readonly<{
    browser: Browser;
    baseURL: string | undefined;
    workspaceSlug: string;
    user: E2EWorkerCredentials;
  }>,
): Promise<void> {
  const { workspaceSlug, user } = options;
  const context = await options.browser.newContext({
    baseURL: options.baseURL,
    reducedMotion: "reduce",
  });
  await installDuckDbExtensionCache(context);
  try {
    const page = await context.newPage();
    await signInWithEmailPassword(page, { ...user, workspaceSlug });
    await importDatasetViaUi({
      page,
      filePath: CASE_LINE_LIST_CSV_PATH,
      expectedRowCount: CASE_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
      workspaceSlug,
      onDatasetCreated: (datasetId) => {
        seededWorld.datasetId = datasetId;
      },
    });
  } finally {
    await context.close();
  }
}

/**
 * Installs the plugin with its cases slot bound to the seeded case type,
 * and waits for the plugin's card to name that case type.
 */
async function _installBoundToCaseType(
  options: Readonly<{
    page: Page;
    workspaceSlug: string;
    onInstallStarted: () => void;
  }>,
): Promise<void> {
  const { page } = options;
  await installPluginThroughWizard(page, {
    workspaceSlug: options.workspaceSlug,
    pluginName: PLUGIN_NAME,
    chooseRecords: (wizard) => {
      return _chooseCaseRecords({ page, wizard });
    },
    onInstallStarted: options.onInstallStarted,
  });
  await expect(
    getPluginCard(page, PLUGIN_NAME).getByText(`Case type: ${CASE_TYPE_NAME}`, {
      exact: true,
    }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/** Opens the Data Explorer with a result on screen, so commands turn on. */
async function _showQueryResult(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  // The `?sql=` deep link stands in for typing the query: the editor is not
  // what this spec covers, and the command is still driven by clicks.
  await page.goto(
    `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(RESULT_SQL)}`,
  );
  await dismissBlockingOverlays(page);
  await expect(
    page.getByRole("columnheader", { name: "second_number", exact: true }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * The cases per onset week, in order, as the line list's dates fall in MMWR
 * weeks, and the same split by district in the order of `DISTRICTS`.
 */
const WEEKLY_CASE_COUNTS = [["6"], ["10"], ["9"], ["5"]];
const WEEKLY_CASE_COUNTS_BY_DISTRICT = [
  ["3", "2", "1"],
  ["5", "3", "2"],
  ["4", "4", "1"],
  ["2", "1", "2"],
];

/**
 * Opens the chart's data table, if it is not open, and checks the count in
 * each series column of each period's row.
 */
async function _expectTableCounts(
  options: Readonly<{ dialog: Locator; expectedCounts: string[][] }>,
): Promise<void> {
  const { dialog, expectedCounts } = options;
  const showButton = dialog.getByRole("button", {
    name: "Show as table",
    exact: true,
  });
  if (await showButton.isVisible()) {
    await showButton.click();
  }
  const table = dialog.getByRole("table", {
    name: "Cases in each period of the case epicurve",
  });
  const bodyRows = table.locator("tbody tr");
  await expect(bodyRows).toHaveCount(expectedCounts.length);
  for (const [rowIndex, expectedRowCounts] of expectedCounts.entries()) {
    await expect(bodyRows.nth(rowIndex).getByRole("cell")).toHaveText(
      expectedRowCounts,
    );
  }
}

/**
 * Runs the Case epicurve from the toolbar and checks its bars and the counts
 * in its data table: one bar per onset week, then one per week and district
 * once stacked by district.
 */
async function _expectCaseEpicurveBars(page: Page): Promise<void> {
  await runPluginCommand(page, "Case epicurve");
  const dialog = page.getByRole("dialog", {
    name: "Case epicurve",
    exact: true,
  });
  const chart = dialog.getByRole("img", { name: "Case epicurve", exact: true });
  await expect(chart).toBeVisible({ timeout: LONG_WAIT });
  await expect(_getBars(chart)).toHaveCount(EPI_WEEK_COUNT);
  await _expectTableCounts({ dialog, expectedCounts: WEEKLY_CASE_COUNTS });

  await dialog
    .getByRole("switch", { name: "Stack by district", exact: true })
    .click();
  await expect(dialog.locator(".recharts-legend-item-text")).toHaveText(
    DISTRICTS,
  );
  await expect(_getBars(chart)).toHaveCount(EPI_WEEK_COUNT * DISTRICTS.length);
  await _expectTableCounts({
    dialog,
    expectedCounts: WEEKLY_CASE_COUNTS_BY_DISTRICT,
  });
}

/** Deletes the plugin's install, which deletes its binding with it. */
async function _deletePluginInstallation(
  options: Readonly<{ admin: AvaSupabaseDBClient; workspaceId: string }>,
): Promise<void> {
  const { error } = await options.admin
    .from("plugin_installations")
    .delete()
    .eq("workspace_id", options.workspaceId)
    .eq("plugin_id", PLUGIN_ID);
  if (error) {
    console.warn(
      `[e2e] case slot plugin installation cleanup: ${error.message}`,
    );
  }
}

test.describe("Epidemiology plugin cases slot", () => {
  test.beforeAll(async ({ browser, e2eWorkerDb }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    seededWorld.workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    await _importLineList({
      browser,
      baseURL: testInfo.project.use.baseURL,
      workspaceSlug,
      user: primaryUser,
    });
    if (!seededWorld.datasetId) {
      throw new Error("The line list dataset was not created.");
    }
    seededWorld.caseType = await CaseTypeSeedHelpers.seedCaseTypeWithFields({
      supabaseAdminClient: admin,
      workspaceId: seededWorld.workspaceId,
      caseTypeName: CASE_TYPE_NAME,
      datasetId: seededWorld.datasetId,
      keyColumnName: "case_id",
      keyAttributeName: "case_id",
      fields: [
        { columnName: "onset_date", dataType: "date" },
        { columnName: "district", dataType: "varchar" },
      ],
      recordKeys: CASE_IDS,
    });
  });

  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    const { caseType, datasetId, workspaceId } = seededWorld;
    // Each step runs even when an earlier one fails, and the failures are
    // rethrown together so a leak is still visible.
    const failureMessages: string[] = [];
    if (caseType) {
      await CaseTypeSeedHelpers.deleteCaseType({
        supabaseAdminClient: admin,
        conceptId: caseType.conceptId,
      }).catch((error: unknown) => {
        failureMessages.push(
          `case type ${caseType.conceptId}: ${String(error)}`,
        );
      });
    }
    if (datasetId && workspaceId) {
      await deleteDatasetFixture({ admin, datasetId, workspaceId }).catch(
        (error: unknown) => {
          failureMessages.push(`dataset ${datasetId}: ${String(error)}`);
        },
      );
    }
    if (failureMessages.length > 0) {
      throw new Error(
        `Could not clean up ${failureMessages.length} seeded item(s): ${failureMessages.join("; ")}`,
      );
    }
  });

  test("the Case epicurve charts the bound case type by onset week, stacked by district on request", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    // Set once Install is clicked in the install wizard, so cleanup never
    // deletes an install this spec did not make.
    let didInstall = false;
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await _installBoundToCaseType({
        page,
        workspaceSlug,
        onInstallStarted: () => {
          didInstall = true;
        },
      });

      await _showQueryResult({ page, workspaceSlug });
      await expect(
        page.getByRole("button", { name: "Plugins", exact: true }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
      await _expectCaseEpicurveBars(page);
    } finally {
      // Removes only the install this spec made.
      if (didInstall) {
        await _deletePluginInstallation({ admin, workspaceId });
      }
    }
  });
});
