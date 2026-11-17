/*
 * A workspace owner imports a coded line list and converts it in place from
 * the dataset's menu, after confirming it changes the dataset for the whole
 * workspace. The conversion is pinned: relabelling a code on the dictionary
 * shows the dataset as behind until Re-apply. The imported dataset is a
 * precondition and the dictionary is seeded before the first page load.
 * Everything the test creates is deleted afterwards.
 */
import { expect, test as base } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
  MEASLES_LINE_LIST_CSV_PATH,
} from "./helpers/constants";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { seedDataDictionary } from "./helpers/seedDataDictionary";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { SeedEntry } from "./helpers/seedDataDictionary";
import type { Page } from "@playwright/test";

const DICTIONARY_NAME = "E2E line list codes to change in place";

/** Sex with 9, so every GENDER value has a label and none is unmatched. */
const ENTRIES: readonly SeedEntry[] = [
  {
    name: "sex",
    columnNames: ["GENDER"],
    kind: "categorical",
    codeList: {
      name: "Sex (1/2/9)",
      pairs: [
        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
        { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
        { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
      ],
    },
  },
];

/** Converts GENDER in place, ticking the workspace-wide warning. */
async function _convertInPlace(page: Page, datasetName: string): Promise<void> {
  await page.getByRole("button", { name: "More dataset actions" }).click();
  await page.getByRole("menuitem", { name: /Apply a dictionary/ }).click();
  const genderRow = page.getByRole("row").filter({
    has: page.getByRole("button", { name: "GENDER", exact: true }),
  });
  await expect(genderRow.getByRole("button", { pressed: true })).toContainText(
    "Sex (1/2/9)",
    { timeout: LONG_WAIT },
  );
  await page.getByText("Convert all", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Convert all" })).toBeChecked();
  // Every value has a label, so the step has nothing to resolve.
  await page.getByRole("button", { name: "Next: unmatched values" }).click();
  await page.getByRole("button", { name: "Next: save as" }).click();
  const changeCard = page.getByRole("radio", {
    name: `Change ${datasetName}`,
    exact: true,
  });
  await changeCard.click();
  await expect(changeCard).toBeChecked();
  const changeButton = page.getByRole("button", { name: "Change 1 column" });
  await expect(changeButton).toBeDisabled();
  await page
    .getByLabel(
      `I understand this changes ${datasetName} for the whole workspace`,
    )
    .check();
  await expect(changeButton).toBeEnabled();
  await changeButton.click();
}

/** The dataset rail's line for this dictionary's pinned conversion. */
function _railNote(page: Page, text: string) {
  return page.getByRole("definition").filter({ hasText: text });
}

/** Relabels 2 on the dictionary, opened from the dataset's rail. */
async function _relabelFemale(page: Page): Promise<void> {
  await page.getByRole("link", { name: DICTIONARY_NAME }).first().click();
  await page.getByRole("tab", { name: /Code lists/ }).click();
  const codeLists = page.getByRole("tabpanel", { name: /Code lists/ });
  await codeLists.getByText("Sex (1/2/9)", { exact: true }).click();
  // The editor names each label input by its row, and row 2 of the seeded
  // list is code 2, Female.
  await codeLists.getByLabel("Target value 2").fill("Woman");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Dictionary saved")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/** Used by says the dataset is behind; opens the dataset from there. */
async function _expectBehindInUsedBy(
  page: Page,
  datasetName: string,
): Promise<void> {
  await page.getByRole("tab", { name: /Used by/ }).click();
  // By its link, since the name has regex characters like ".". In the tab,
  // since the list pane links to the dataset too.
  const datasetLink = page.getByRole("link", {
    name: datasetName,
    exact: true,
  });
  const row = page
    .getByRole("tabpanel", { name: /Used by/ })
    .getByRole("row")
    .filter({ has: datasetLink });
  await expect(row).toContainText("Changed the data");
  await expect(row).toContainText("Applied version 1, now version 2");
  await row.getByRole("link", { name: datasetName, exact: true }).click();
}

/** Re-applies from the rail, confirming the workspace-wide change. */
async function _reapplyFromRail(
  page: Page,
  datasetName: string,
): Promise<void> {
  await page
    .getByRole("button", {
      name: `Re-apply ${DICTIONARY_NAME} to ${datasetName}`,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: `Re-apply ${DICTIONARY_NAME}?`,
  });
  await expect(dialog).toContainText(
    `This changes ${datasetName} for everyone in the workspace who uses it.`,
  );
  await dialog.getByRole("button", { name: "Re-apply", exact: true }).click();
  await expect(
    page.getByText(`Re-applied ${DICTIONARY_NAME} to ${datasetName}.`),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/** The seeded dictionary, and the line list a test imports through the UI. */
type LineListFixture = {
  admin: AvaSupabaseDBClient;
  /** Signs in and imports the line list. Returns the dataset id. */
  signInAndImport: () => Promise<string>;
};

/**
 * Seeds the dictionary before the first page load. Afterwards it deletes
 * the imported dataset, then the dictionary, whose children cascade. Each
 * deletion runs even when the other fails.
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
      await use({ admin, signInAndImport });
    } finally {
      try {
        if (datasetId) {
          await deleteDatasetFixture({ admin, datasetId, workspaceId });
        }
      } finally {
        await admin
          .from("data_dictionaries")
          .delete()
          .eq("id", dictionaryId)
          .throwOnError();
      }
    }
  },
});

test.describe("converting a dataset in place", () => {
  test("a dataset converted in place keeps its version until Re-apply", async ({
    page,
    lineList,
  }) => {
    const { admin } = lineList;
    const datasetId = await lineList.signInAndImport();
    const { data: dataset } = await admin
      .from("datasets")
      .select("name")
      .eq("id", datasetId)
      .single()
      .throwOnError();

    await _convertInPlace(page, dataset.name);
    // The apply flow's URL holds the dataset id too, so wait to leave it.
    await expect(page).not.toHaveURL(/apply-dictionaries/, {
      timeout: LONG_WAIT,
    });
    await expect(page).toHaveURL(new RegExp(datasetId));
    await expect(
      page.getByRole("gridcell", { name: "Female" }).first(),
    ).toBeVisible({ timeout: LONG_WAIT });
    await expect(
      _railNote(page, "Converted this dataset · version 1"),
    ).toBeVisible();

    await _relabelFemale(page);
    await _expectBehindInUsedBy(page, dataset.name);
    await expect(
      page.getByRole("gridcell", { name: "Female" }).first(),
    ).toBeVisible({ timeout: LONG_WAIT });
    await expect(
      _railNote(page, "Applied version 1, now version 2"),
    ).toBeVisible();

    await _reapplyFromRail(page, dataset.name);
    await expect(
      page.getByRole("gridcell", { name: "Woman" }).first(),
    ).toBeVisible({ timeout: LONG_WAIT });
    await expect(
      _railNote(page, "Converted this dataset · version 2"),
    ).toBeVisible();

    const { data: binding } = await admin
      .from("dataset_columns__dictionary_bindings")
      .select("mode, applied_dictionary_version, pinned_pairs")
      .eq("dataset_id", datasetId)
      .single()
      .throwOnError();
    expect(binding.mode).toBe("convert");
    expect(binding.applied_dictionary_version).toBe(2);
    expect(JSON.stringify(binding.pinned_pairs)).toContain('"Woman"');
  });
});
