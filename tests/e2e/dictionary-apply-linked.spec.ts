/*
 * A workspace owner imports a coded line list, converts it into a linked
 * dataset from the dataset's menu, and reads the labels back on the linked
 * dataset's page and rails. Relabelling a code on the dictionary reaches the
 * linked dataset without a reload. The imported dataset is a precondition and
 * the dictionary is seeded before the first page load. Everything the test
 * creates is deleted afterwards.
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

const DICTIONARY_NAME = "E2E line list codes to convert";

/** Sex without 9, so the line list's three 9s are unmatched. */
const ENTRIES: readonly SeedEntry[] = [
  {
    name: "sex",
    columnNames: ["GENDER"],
    kind: "categorical",
    description: "Sex recorded on the case report.",
    codeList: {
      name: "Sex (1/2)",
      pairs: [
        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
        { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
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
];

/** Opens Apply from the menu, which now promises to convert. */
async function _openApply(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More dataset actions" }).click();
  const applyItem = page.getByRole("menuitem", { name: /Apply a dictionary/ });
  await expect(applyItem).toContainText(
    "Convert values and add column descriptions",
  );
  await applyItem.click();
}

/** Waits for the matches, then converts every coded column. */
async function _convertAll(page: Page): Promise<void> {
  const genderRow = page.getByRole("row").filter({
    has: page.getByRole("button", { name: "GENDER", exact: true }),
  });
  await expect(genderRow.getByRole("button", { pressed: true })).toContainText(
    "Sex (1/2)",
    { timeout: LONG_WAIT },
  );
  await page.getByText("Convert all", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Convert all" })).toBeChecked();
}

/** Labels GENDER's 9, three rows, with Add to list. */
async function _labelUnmatchedNine(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Next: unmatched values" }).click();
  const section = page.getByRole("region", { name: "Values being converted" });
  const nineRow = section
    .getByRole("row")
    .filter({ hasText: "GENDER" })
    .filter({ has: page.getByRole("cell", { name: "9", exact: true }) });
  await expect(nineRow).toContainText("3", { timeout: MEDIUM_WAIT });
  await nineRow.getByText("Add to list", { exact: true }).click();
  await nineRow
    .getByRole("textbox", { name: "Target value for 9" })
    .fill("Unknown");
}

/** Opens the preview, sees a label, and closes it from the keyboard. */
async function _previewAndClose(page: Page): Promise<void> {
  const previewButton = page.getByRole("button", { name: "Preview data" });
  await previewButton.click();
  const preview = page.getByRole("region", { name: "Preview data" });
  await expect(preview).toContainText("Male", { timeout: MEDIUM_WAIT });
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await expect(previewButton).toBeFocused();
}

/** Reads the id of the linked dataset that reads `sourceId`, once it exists. */
async function _waitForLinkedDatasetId(
  admin: AvaSupabaseDBClient,
  sourceId: string,
): Promise<string> {
  let linkedId: string | undefined;
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("datasets__virtual")
          .select("dataset_id")
          .eq("linked_source_dataset_id", sourceId)
          .throwOnError();
        linkedId = data[0]?.dataset_id;
        return linkedId;
      },
      { timeout: LONG_WAIT },
    )
    .toBeDefined();
  return linkedId!;
}

/** Saves as a new linked dataset with the default name. Returns the name. */
async function _createLinkedDataset(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Next: save as" }).click();
  await expect(
    page.getByRole("radio", { name: /Create a new linked dataset/ }),
  ).toBeChecked();
  const nameInput = page.getByLabel("Name", { exact: true });
  await expect(nameInput).toHaveValue(/\(labeled\)$/);
  const linkedName = await nameInput.inputValue();
  await page.getByRole("button", { name: "Create linked dataset" }).click();
  return linkedName;
}

/** The linked dataset's page: labels, its source, and the popover. */
async function _expectLinkedDatasetPage(
  page: Page,
  sourceName: string,
): Promise<void> {
  await expect(
    page.getByRole("gridcell", { name: "Female" }).first(),
  ).toBeVisible({
    timeout: LONG_WAIT,
  });
  await expect(
    page.getByRole("gridcell", { name: "Unknown" }).first(),
  ).toBeVisible();
  // The rail's Reads fact, since the list pane links to the source too.
  await expect(
    page.getByRole("definition").filter({ hasText: sourceName }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Code list for GENDER" }).focus();
  await expect(
    page.getByRole("dialog", { name: "Code list for GENDER" }),
  ).toContainText("The values were converted to these labels.");
  await page.keyboard.press("Escape");
}

/** Relabels 2 on the dictionary, then opens the linked dataset from Used by. */
async function _relabelFemaleThenOpenLinked(
  page: Page,
  linkedName: string,
): Promise<void> {
  await page.getByRole("link", { name: DICTIONARY_NAME }).first().click();
  await page.getByRole("tab", { name: /Code lists/ }).click();
  const codeLists = page.getByRole("tabpanel", { name: /Code lists/ });
  await codeLists.getByText("Sex (1/2)", { exact: true }).click();
  // The editor names each label input by its row, and row 2 of the seeded
  // list is code 2, Female.
  await codeLists.getByLabel("Target value 2").fill("Woman");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Dictionary saved")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await page.getByRole("tab", { name: /Used by/ }).click();
  // By its link, since the name has regex characters like "(labeled)". In
  // the tab, since the list pane links to the linked dataset too.
  const linkedLink = page.getByRole("link", { name: linkedName, exact: true });
  const linkedRow = page
    .getByRole("tabpanel", { name: /Used by/ })
    .getByRole("row")
    .filter({ has: linkedLink });
  await expect(linkedRow).toContainText("Linked");
  await linkedRow.getByRole("link", { name: linkedName, exact: true }).click();
}

/**
 * Deletes every linked dataset that reads `datasetId`, then `datasetId`
 * itself. Each deletion runs even when an earlier one fails.
 */
async function _deleteLinkedThenSource(
  admin: AvaSupabaseDBClient,
  options: Readonly<{ datasetId: string; workspaceId: string }>,
): Promise<void> {
  const { datasetId, workspaceId } = options;
  try {
    const { data: linked } = await admin
      .from("datasets__virtual")
      .select("dataset_id")
      .eq("linked_source_dataset_id", datasetId)
      .throwOnError();
    await _deleteEach(admin, {
      datasetIds: linked.map((row) => {
        return row.dataset_id;
      }),
      workspaceId,
    });
  } finally {
    await deleteDatasetFixture({ admin, datasetId, workspaceId });
  }
}

/** Deletes each dataset, trying the rest when one fails, then rethrows. */
async function _deleteEach(
  admin: AvaSupabaseDBClient,
  options: Readonly<{ datasetIds: readonly string[]; workspaceId: string }>,
): Promise<void> {
  const [firstId, ...restIds] = options.datasetIds;
  if (firstId === undefined) {
    return;
  }
  try {
    await deleteDatasetFixture({
      admin,
      datasetId: firstId,
      workspaceId: options.workspaceId,
    });
  } finally {
    await _deleteEach(admin, { ...options, datasetIds: restIds });
  }
}

/** The seeded dictionary, and the line list a test imports through the UI. */
type LineListFixture = {
  admin: AvaSupabaseDBClient;
  /** Signs in and imports the line list. Returns the dataset id. */
  signInAndImport: () => Promise<string>;
};

/**
 * Seeds the dictionary before the first page load. Afterwards it deletes
 * every linked dataset that reads the import, the import, then the
 * dictionary, whose children cascade.
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
          await _deleteLinkedThenSource(admin, { datasetId, workspaceId });
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

test.describe("converting into a linked dataset", () => {
  test("a linked dataset holds labels and follows the dictionary", async ({
    page,
    lineList,
  }) => {
    const { admin } = lineList;
    const sourceId = await lineList.signInAndImport();
    const { data: source } = await admin
      .from("datasets")
      .select("name")
      .eq("id", sourceId)
      .single()
      .throwOnError();

    await _openApply(page);
    await _convertAll(page);
    await _labelUnmatchedNine(page);
    await _previewAndClose(page);
    const linkedName = await _createLinkedDataset(page);
    const linkedId = await _waitForLinkedDatasetId(admin, sourceId);
    await expect(page).toHaveURL(new RegExp(linkedId), { timeout: LONG_WAIT });
    await _expectLinkedDatasetPage(page, source.name);

    await page.getByRole("link", { name: source.name }).first().click();
    await expect(page.getByText(`Linked dataset: ${linkedName}`)).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await _relabelFemaleThenOpenLinked(page, linkedName);
    await expect(
      page.getByRole("gridcell", { name: "Woman" }).first(),
    ).toBeVisible({
      timeout: LONG_WAIT,
    });

    const { data: bindings } = await admin
      .from("dataset_columns__dictionary_bindings")
      .select("dataset_id, mode, pinned_pairs")
      .in("dataset_id", [sourceId, linkedId])
      .throwOnError();
    expect(
      bindings
        .map((binding) => {
          const owner = binding.dataset_id === linkedId ? "linked" : "source";
          return `${owner}:${binding.mode}:${binding.pinned_pairs === null}`;
        })
        .sort(),
    ).toEqual([
      "linked:convert:true",
      "linked:convert:true",
      "source:reference:true",
      "source:reference:true",
    ]);
  });
});
