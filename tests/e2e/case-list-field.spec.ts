/*
 * A case type field switched to "Every value" in the chat draft card keeps
 * every dataset value, and the record page lists them all.
 *
 * Chat is stubbed: every message turn answers with a ready proposal naming
 * the imported dataset's real column ids, so the test drives the card, not a
 * model. The dataset is imported in `beforeAll`, in a browser context of its
 * own, so the session under test starts after it exists. Creating the case
 * type is the behavior under test, so it goes through the UI; the test only
 * reads the database to learn when the first sync has written the records,
 * and to clean up.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
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
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Page } from "@playwright/test";

test.use({ trace: "retain-on-failure" });

const CASE_TYPE_NAME = "E2E county daily cases";
const KEY_COLUMN_NAME = "Admin2";
const LIST_COLUMN_NAME = "daily_new_cases";
const LIST_FIELD_NAME = "Daily new cases";
/** One record per distinct `Admin2` in the small California CSV. */
const RECORD_COUNT = 60;
const RECORD_KEY = "Alameda";
/** Alameda's `daily_new_cases`, in file order. */
const RECORD_VALUES = ["31", "48"];

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
  columnIdsByName: Record<string, string> | undefined;
} = {
  workspaceId: undefined,
  datasetId: undefined,
  columnIdsByName: undefined,
};

/** Oracle read: the imported dataset's column ids, by column name. */
async function _getColumnIdsByName(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  datasetId: string;
}): Promise<Record<string, string>> {
  const { data } = await options.supabaseAdminClient
    .from("dataset_columns")
    .select("id, name")
    .eq("dataset_id", options.datasetId)
    .throwOnError();
  return Object.fromEntries(
    data.map((column) => {
      return [column.name, column.id];
    }),
  );
}

/** Oracle read: how many records the case type of this name has. */
async function _countRecords(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
}): Promise<number> {
  const { data: concepts } = await options.supabaseAdminClient
    .from("concepts")
    .select("id")
    .eq("workspace_id", options.workspaceId)
    .eq("name", CASE_TYPE_NAME)
    .throwOnError();
  const conceptId = concepts[0]?.id;
  if (!conceptId) {
    return 0;
  }
  const { count } = await options.supabaseAdminClient
    .from("individuals")
    .select("id", { count: "exact", head: true })
    .eq("concept_id", conceptId)
    .throwOnError();
  return count ?? 0;
}

/** The proposal chat would make: one dataset, County as key and label. */
function _makeProposal(options: {
  datasetId: string;
  columnIdsByName: Record<string, string>;
}): unknown {
  const keyColumnId = options.columnIdsByName[KEY_COLUMN_NAME];
  const listColumnId = options.columnIdsByName[LIST_COLUMN_NAME];
  return {
    name: CASE_TYPE_NAME,
    description: "One California county's daily case counts",
    allowManualCreation: false,
    sourceDatasets: [
      { datasetId: options.datasetId, primaryKeyColumnId: keyColumnId },
    ],
    labelColumnId: keyColumnId,
    attributes: [
      {
        datasetId: options.datasetId,
        columnId: keyColumnId,
        name: "County",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "first",
      },
      {
        datasetId: options.datasetId,
        columnId: listColumnId,
        name: LIST_FIELD_NAME,
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "sum",
      },
    ],
    manualEntryAttributes: [],
  };
}

/** Answers every chat turn with the proposal, never reaching a model. */
async function _mountProposingChat(options: {
  page: Page;
  proposal: unknown;
}): Promise<void> {
  const { page, proposal } = options;
  await page.route("**/functions/v1/chat/*/session-secret", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionSecret: Buffer.alloc(32, 0x42).toString("base64"),
        issuedAt: Date.now(),
      }),
    });
  });
  await page.route("**/functions/v1/chat/*/messages", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assistantText: "Here is a draft.",
        proposedCaseType: proposal,
      }),
    });
  });
}

test.describe("Case list fields", () => {
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
    seededWorld.columnIdsByName = await _getColumnIdsByName({
      supabaseAdminClient: admin,
      datasetId: seededWorld.datasetId,
    });
  });

  // Removes the case type the test created (cascading to its fields,
  // statuses, and records) and the dataset, whatever the test did.
  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    if (seededWorld.workspaceId) {
      await admin
        .from("concepts")
        .delete()
        .eq("workspace_id", seededWorld.workspaceId)
        .eq("name", CASE_TYPE_NAME)
        .throwOnError();
    }
    if (seededWorld.datasetId && seededWorld.workspaceId) {
      await deleteDatasetFixture({
        admin,
        datasetId: seededWorld.datasetId,
        workspaceId: seededWorld.workspaceId,
      });
    }
  });

  test("a field switched to every value in the chat draft lists every value on the record page", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    // A LIST result column used to log this on every page that read one.
    const arrowTypeErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        message.text().includes("Unhandleable arrow type")
      ) {
        arrowTypeErrors.push(message.text());
      }
    });
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { workspaceId, datasetId, columnIdsByName } = seededWorld;
    if (!workspaceId || !datasetId || !columnIdsByName) {
      throw new Error("beforeAll did not import the dataset.");
    }
    await _mountProposingChat({
      page,
      proposal: _makeProposal({ datasetId, columnIdsByName }),
    });
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await page.getByRole("link", { name: "Case Manager" }).click();
    // The home page and its navbar both offer New case type, and both start
    // the same design session.
    await page.getByRole("button", { name: "New case type" }).first().click();

    const valueShape = page.getByRole("radiogroup", {
      name: `How many values ${LIST_FIELD_NAME} keeps`,
    });
    await expect(valueShape).toBeVisible({ timeout: MEDIUM_WAIT });
    await valueShape.getByText("Every value", { exact: true }).click();
    await expect(
      valueShape.getByRole("radio", { name: "Every value" }),
    ).toBeChecked();
    await expect(
      page.getByLabel(`Value to keep for ${LIST_FIELD_NAME}`),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Create case type" }).click();
    await expect(page.getByText(`Created ${CASE_TYPE_NAME}`)).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    // Creating a case type syncs its records in the background. The records
    // list reads them once, so open it only after that sync has written them.
    await expect
      .poll(
        async () => {
          return _countRecords({ supabaseAdminClient: admin, workspaceId });
        },
        { timeout: LONG_WAIT },
      )
      .toBe(RECORD_COUNT);

    // Designing in chat leaves Ask Avandar expanded over the page. Docking it
    // is what a person does to get back to the case types.
    await page.getByRole("button", { name: "Dock chat panel" }).click();
    await page.getByRole("link", { name: CASE_TYPE_NAME, exact: true }).click();
    await page
      .getByRole("link", { name: new RegExp(`${RECORD_KEY}$`) })
      .click();

    // Exact, because the rail also has a "Sources of Daily new cases" list.
    await expect(
      page
        .getByRole("list", { name: LIST_FIELD_NAME, exact: true })
        .getByRole("listitem"),
    ).toHaveText(RECORD_VALUES, { timeout: MEDIUM_WAIT });
    expect(arrowTypeErrors).toEqual([]);
  });
});
