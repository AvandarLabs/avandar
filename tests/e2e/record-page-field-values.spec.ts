/*
 * The record page's Details rail, end to end: a record of a case type over a
 * real dataset shows its field's value and the dataset that value comes from.
 *
 * The dataset is imported and the case type seeded in `beforeAll`, in a
 * browser context of its own, for the reason
 * `case-statuses-data-explorer.spec.ts` gives: the case type list is cached
 * for minutes once a session loads it, so the session under test has to start
 * after the case type exists.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CaseTypeSeedHelpers } from "./helpers/CaseTypeSeedHelpers";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
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

test.use({ trace: "retain-on-failure" });

const CASE_TYPE_NAME = "E2E county records";
const KEY_COLUMN_NAME = "Admin2";
const KEY_ATTRIBUTE_NAME = "County";
const RECORD_KEY = "Alameda";

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
  caseType: SeededCaseType | undefined;
} = { workspaceId: undefined, datasetId: undefined, caseType: undefined };

/** Oracle read: the imported dataset's name, which the rail shows. */
async function _readDatasetName(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  datasetId: string;
}): Promise<string> {
  const { data } = await options.supabaseAdminClient
    .from("datasets")
    .select("name")
    .eq("id", options.datasetId)
    .single()
    .throwOnError();
  return data.name;
}

test.describe("Record page field values", () => {
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
      recordKeys: [RECORD_KEY],
    });
  });

  // Removes the case type (with its statuses and records) and the dataset,
  // whatever the test did.
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

  test("shows a field's value and the dataset it comes from in the record's Details", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    if (!seededWorld.datasetId) {
      throw new Error("beforeAll did not import the dataset.");
    }
    const datasetName = await _readDatasetName({
      supabaseAdminClient: createSupabaseAdminClient(),
      datasetId: seededWorld.datasetId,
    });

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
    // Each row's link names the record after its status dot, as in
    // `case-statuses-data-explorer.spec.ts`.
    await page
      .getByRole("link", { name: new RegExp(`${RECORD_KEY}$`) })
      .click();

    // Scoped to the one fact whose term is the field's name, so the record's
    // name in the header and in the list cannot match.
    const countyFact = page.locator("dl > div").filter({
      has: page
        .getByRole("term")
        .filter({ hasText: new RegExp(`^${KEY_ATTRIBUTE_NAME}$`) }),
    });
    await expect(countyFact).toHaveCount(1, { timeout: MEDIUM_WAIT });
    const countyValue = countyFact.getByRole("definition");
    await expect(countyValue).toContainText(RECORD_KEY, {
      timeout: MEDIUM_WAIT,
    });
    await expect(countyValue).toContainText(datasetName);
  });
});
