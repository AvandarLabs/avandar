/*
 * A workspace owner imports a coded line list, applies a dictionary to it
 * as reference from the dataset's menu, and reads the codes back: in the
 * dataset's column list, in its rail, in the Data Explorer's grid, and in
 * Ask Avandar's offline answer to a question asked in labels. The imported
 * dataset is a precondition and the dictionary is seeded before the first
 * page load. Everything the tests create is deleted afterwards.
 */
import { expect, test as base } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
  MEASLES_LINE_LIST_CSV_PATH,
} from "./helpers/constants";
import { runSqlOverDataset } from "./helpers/dataExplorerFlow";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { openAgentChat } from "./helpers/openAgentChat";
import { seedDataDictionary } from "./helpers/seedDataDictionary";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { SeedEntry } from "./helpers/seedDataDictionary";
import type { Page } from "@playwright/test";

const DICTIONARY_NAME = "E2E line list codes to apply";

const SEX_CODE_LIST_NAME = "Sex (1/2/9)";

const ENTRIES: readonly SeedEntry[] = [
  {
    name: "sex",
    columnNames: ["GENDER"],
    kind: "categorical",
    description: "Sex recorded on the case report.",
    codeList: {
      name: SEX_CODE_LIST_NAME,
      pairs: [
        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
        {
          code: "2",
          label: "Female",
          acceptedSpellings: [],
          isMissing: false,
        },
        {
          code: "9",
          label: "Unknown",
          acceptedSpellings: [],
          isMissing: true,
        },
      ],
    },
  },
  {
    name: "hospitalized",
    columnNames: ["hosp_yn"],
    kind: "categorical",
    codeList: {
      name: "Yes/No",
      pairs: [
        { code: "Y", label: "Yes", acceptedSpellings: [], isMissing: false },
        { code: "N", label: "No", acceptedSpellings: [], isMissing: false },
      ],
    },
  },
  {
    name: "case_id",
    columnNames: [],
    kind: "identifier",
    description: "Case number assigned by the county.",
  },
];

/** Applies the seeded dictionary to the open dataset through its menu. */
async function _attachDictionary(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More dataset actions" }).click();
  await page.getByRole("menuitem", { name: /Apply a dictionary/ }).click();
  const genderRow = page.getByRole("row").filter({
    has: page.getByRole("button", { name: "GENDER", exact: true }),
  });
  await expect(genderRow.getByRole("button", { pressed: true })).toContainText(
    SEX_CODE_LIST_NAME,
    { timeout: LONG_WAIT },
  );
  await page.getByRole("button", { name: "Next: attach" }).click();
  await page.getByRole("button", { name: /^Attach to / }).click();
  await expect(page.getByText(/The data is unchanged\./)).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/** The dataset page shows the codes, the entry's description, and the rail. */
async function _expectCodesOnDatasetPage(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Code list for GENDER" }).focus();
  const popover = page.getByRole("dialog", { name: "Code list for GENDER" });
  await expect(popover).toContainText("Female");
  await expect(popover).toContainText(
    "Attached as reference. The values in the data are unchanged.",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Case number assigned by the county."),
  ).toBeVisible();
  // The rail's caption, since the list pane links to the dictionary too.
  await expect(
    page.getByText("Attached as reference · data unchanged"),
  ).toBeVisible();
  await page.getByRole("button", { name: "More dataset actions" }).click();
  await expect(
    page.getByRole("menuitem", { name: /Apply a dictionary/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", {
      name: /Create a dictionary from this dataset/,
    }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
}

/** A Data Explorer query of the bound column shows its tag in the header. */
async function _expectCodesInExplorer(
  page: Page,
  options: Readonly<{ admin: AvaSupabaseDBClient; datasetId: string }>,
): Promise<void> {
  const { data: dataset } = await options.admin
    .from("datasets")
    .select("name")
    .eq("id", options.datasetId)
    .single()
    .throwOnError();
  await runSqlOverDataset({
    page,
    datasetName: dataset.name,
    columnName: "GENDER",
    sql: `SELECT "GENDER", "hosp_yn" FROM "${options.datasetId}"`,
  });
  await expect(
    page.getByRole("button", { name: "Code list for GENDER" }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * The table alias the agent gives a dataset: `t` and its place among the
 * workspace's dataset ids, sorted, as `SqlTableAliasModule.fromDatasets`
 * assigns it. The module cannot be imported here: it loads `ColumnCodes`,
 * whose entry file merges a namespace with a value export, which
 * Playwright's Babel transform refuses as a duplicate export.
 */
async function _getAlias(
  admin: AvaSupabaseDBClient,
  options: Readonly<{ workspaceId: string; datasetId: string }>,
): Promise<string> {
  const { data: datasetRows } = await admin
    .from("datasets")
    .select("id")
    .eq("workspace_id", options.workspaceId)
    .throwOnError();
  const sortedIds = datasetRows
    .map((datasetRow) => {
      return datasetRow.id;
    })
    .sort((left, right) => {
      return left.localeCompare(right);
    });
  return `t${sortedIds.indexOf(options.datasetId)}`;
}

/** The scripted offline model: a code-list question, then its reply. */
function _buildOfflineScript(alias: string) {
  const sql = `SELECT count(*) AS female_hospitalized FROM "${alias}" WHERE "GENDER" = 2 AND "hosp_yn" = 'Y'`;
  return [
    {
      match: "female_hospitalized",
      response: JSON.stringify({
        action: "reply",
        text: "One female case was hospitalized.",
      }),
    },
    {
      match: '"female" is code 2',
      response: JSON.stringify({
        action: "run_query",
        args: { sql, summary: "Female cases that were hospitalized." },
      }),
    },
  ];
}

/**
 * Turns on the data agent and offline mode with a downloaded model, so Ask
 * Avandar runs on the scripted model, and aborts and counts every request
 * to the online agent. The script starts as a placeholder that matches
 * nothing; {@link _setOfflineScript} fills it in once the alias is known.
 */
async function _useScriptedOfflineAgent(
  page: Page,
): Promise<{ getOnlineRequestCount: () => number }> {
  let onlineRequestCount = 0;
  await page.route("**/functions/v1/chat/*/agent/**", async (route) => {
    onlineRequestCount += 1;
    await route.abort();
  });
  await page.addInitScript(() => {
    window.localStorage.setItem("avandar:data-agent", "on");
    window.localStorage.setItem("avandar.offlineChat.isOfflineModeOn", "on");
    window.localStorage.setItem(
      "avandar.offlineChat.downloadedModels",
      JSON.stringify({ "Qwen3-4B-q4f16_1-MLC": true }),
    );
    Object.assign(window, {
      __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__: [
        { match: "never matches", response: "{}" },
      ],
    });
  });
  return {
    getOnlineRequestCount: () => {
      return onlineRequestCount;
    },
  };
}

/** Swaps the real script in. The offline engine reads it on every request. */
async function _setOfflineScript(page: Page, alias: string): Promise<void> {
  await page.evaluate((script) => {
    Object.assign(window, { __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__: script });
  }, _buildOfflineScript(alias));
}

/** The seeded dictionary, and the line list a test imports through the UI. */
type LineListFixture = {
  admin: AvaSupabaseDBClient;
  workspaceId: string;
  /** Signs in and imports the line list. Returns the dataset id. */
  signInAndImport: () => Promise<string>;
};

/**
 * Seeds the dictionary before the first page load. Afterwards it deletes
 * the imported dataset, then the dictionary, whose children cascade.
 */
const test = base.extend<{ lineList: LineListFixture }>({
  lineList: async ({ page, e2eWorkerDb }, use) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    const dictionaryId = await seedDataDictionary({
      admin,
      workspaceId,
      name: DICTIONARY_NAME,
      entries: ENTRIES,
    });
    let datasetId: string | undefined;
    const signInAndImport = async (): Promise<string> => {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      datasetId = await importDatasetViaUi({
        page,
        filePath: MEASLES_LINE_LIST_CSV_PATH,
        expectedRowCount: MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      return datasetId;
    };
    try {
      await use({ admin, workspaceId, signInAndImport });
    } finally {
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
      await admin
        .from("data_dictionaries")
        .delete()
        .eq("id", dictionaryId)
        .throwOnError();
    }
  },
});

test.describe("applying a dictionary as reference", () => {
  test("an applied dictionary explains the codes without changing them", async ({
    page,
    lineList,
  }) => {
    const { admin } = lineList;
    const datasetId = await lineList.signInAndImport();

    await _attachDictionary(page);
    await _expectCodesOnDatasetPage(page);
    await _expectCodesInExplorer(page, { admin, datasetId });

    const { data: bindings } = await admin
      .from("dataset_columns__dictionary_bindings")
      .select("mode")
      .eq("dataset_id", datasetId)
      .throwOnError();
    expect(
      bindings.map((binding) => {
        return binding.mode;
      }),
    ).toEqual(["reference", "reference", "reference"]);
  });

  test("Ask Avandar answers a question in labels from the code list, offline", async ({
    page,
    lineList,
  }) => {
    const offlineAgent = await _useScriptedOfflineAgent(page);
    const datasetId = await lineList.signInAndImport();
    await _attachDictionary(page);
    await _setOfflineScript(
      page,
      await _getAlias(lineList.admin, {
        workspaceId: lineList.workspaceId,
        datasetId,
      }),
    );

    await page
      .getByRole("link", { name: "Data Explorer", exact: true })
      .click();
    await openAgentChat(page);
    const composer = page.getByLabel("Message", { exact: true });
    await composer.fill("How many female cases were hospitalized?");
    await composer.press("Enter");

    await expect(
      page.getByText("One female case was hospitalized."),
    ).toBeVisible({ timeout: LONG_WAIT });
    await expect(
      page.getByRole("columnheader", { name: /female_hospitalized/ }),
    ).toBeVisible();
    expect(offlineAgent.getOnlineRequestCount()).toBe(0);
  });
});
