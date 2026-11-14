/*
 * A workspace owner combines three line lists in two column layouts into
 * one combined dataset with a crosswalk. Two Kings files share CaseNo,
 * GENDER, onset_dt, and zip; a Queens file names the same facts case_id,
 * sex, rash_onset, and zip_code, codes sex as M/F/U, and writes its dates
 * as text. The owner makes the Kings layout the reference, governs GENDER
 * with the dictionary's sex entry, translates the Queens codes with M/F/U,
 * sees the reference translate with 1/2/9 on its own, reads rash_onset as
 * a date, and creates the combined dataset. Its page shows
 * labels, a source_dataset column, the code-list tag, and the crosswalk
 * that combined it. The imported datasets are preconditions and the
 * dictionary is seeded before the first page load. Everything the test
 * creates is deleted afterwards.
 */
import { expect, test as base } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  CROSSWALK_KINGS_APRIL_CSV_PATH,
  CROSSWALK_KINGS_CSV_EXPECTED_ROW_COUNT,
  CROSSWALK_KINGS_MARCH_CSV_PATH,
  CROSSWALK_QUEENS_CSV_EXPECTED_ROW_COUNT,
  CROSSWALK_QUEENS_MARCH_CSV_PATH,
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
import type { Locator, Page } from "@playwright/test";

const DICTIONARY_NAME = "E2E crosswalk codes";
const CROSSWALK_NAME = "Untitled crosswalk";
const COMBINED_NAME = "E2E measles, Kings and Queens";

/** Sex coded 1/2/9 (primary, as the Kings files hold it) and M/F/U. */
const ENTRIES: readonly SeedEntry[] = [
  {
    name: "sex",
    columnNames: ["GENDER", "sex"],
    kind: "categorical",
    description: "Sex recorded on the case report.",
    codeList: {
      name: "Sex (1/2/9)",
      pairs: [
        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
        { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
        { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
      ],
    },
    otherCodeLists: [
      {
        name: "Sex (M/F/U)",
        pairs: [
          { code: "M", label: "Male", acceptedSpellings: [], isMissing: false },
          {
            code: "F",
            label: "Female",
            acceptedSpellings: [],
            isMissing: false,
          },
          {
            code: "U",
            label: "Unknown",
            acceptedSpellings: [],
            isMissing: true,
          },
        ],
      },
    ],
  },
];

/** An imported dataset, by its id and the name the import gave it. */
type SourceDataset = { id: string; name: string };

/** The three imported line lists. */
type SourceDatasets = {
  kingsMarch: SourceDataset;
  kingsApril: SourceDataset;
  queens: SourceDataset;
};

/** The crosswalk the test made, once its combined dataset exists. */
type CombinedCrosswalk = {
  outputDatasetId: string;
  compiledCodeListCount: number;
};

function _escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The current step's sticky footer, where its actions live. */
function _footer(page: Page): Locator {
  return page.locator("[data-sticky-action-bar]");
}

function _mappingTable(page: Page): Locator {
  return page.getByRole("table").filter({
    has: page.getByRole("columnheader", {
      name: "Column of the combined dataset",
    }),
  });
}

/** The side pane's before-and-after example table. */
function _exampleTable(page: Page): Locator {
  return page.getByRole("table", { name: "Example" });
}

/**
 * Waits until step 2 has read the shown layout's values, so a late
 * `values_read` cannot refill the pane after the test edits it.
 */
async function _waitForLayoutValues(page: Page): Promise<void> {
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /^Reading the values of .+ on this device$/ }),
  ).toHaveCount(0, { timeout: LONG_WAIT });
}

/**
 * Picks `optionName` in the Select labelled `label` unless it already
 * shows it: choosing the shown option again would deselect it. An option's
 * name starts with its label and may go on with an example value, as the
 * pane's Column Select's options do.
 */
async function _chooseOption(
  page: Page,
  label: string,
  optionName: string,
): Promise<void> {
  const select = page.getByRole("combobox", { name: label, exact: true });
  await expect(select).toBeVisible();
  if ((await select.inputValue()) === optionName) {
    return;
  }
  await select.click();
  await page
    .getByRole("option", {
      name: new RegExp(`^${_escapeRegExp(optionName)}(?!\\w)`),
    })
    .click();
  await expect(select).toHaveValue(optionName);
}

/** Selects the mapping table's row for one column of the combined dataset. */
async function _selectColumn(page: Page, columnName: string): Promise<void> {
  const nameButton = _mappingTable(page).getByRole("button", {
    name: columnName,
    exact: true,
  });
  await nameButton.click();
  await expect(nameButton).toHaveAttribute("aria-current", "true");
}

/** Selects a layout in the stub by its first dataset's name, then reads it. */
async function _selectLayout(page: Page, layoutName: string): Promise<void> {
  const option = page
    .getByRole("listbox", { name: "Map each dataset" })
    .getByRole("option", { name: new RegExp(_escapeRegExp(layoutName)) });
  await option.click();
  await expect(option).toHaveAttribute("aria-selected", "true", {
    timeout: MEDIUM_WAIT,
  });
  await _waitForLayoutValues(page);
}

/** Opens New crosswalk and adds the three line lists. */
async function _addDatasets(
  page: Page,
  sources: SourceDatasets,
): Promise<void> {
  await page.getByRole("button", { name: "New crosswalk" }).click();
  await page.getByRole("button", { name: "Add datasets", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add datasets" });
  for (const source of [
    sources.kingsMarch,
    sources.kingsApril,
    sources.queens,
  ]) {
    await dialog.getByRole("checkbox", { name: `Pick ${source.name}` }).check();
  }
  await dialog.getByRole("button", { name: "Add 3 datasets" }).click();
  await expect(dialog).toBeHidden();
}

/** Makes the Kings layout the reference, then opens Map each dataset. */
async function _chooseReferenceAndMap(
  page: Page,
  kingsLayoutName: string,
): Promise<void> {
  await expect(page.getByText("+1 with the same layout")).toBeVisible();
  await _chooseOption(page, "Reference layout", kingsLayoutName);
  await _footer(page)
    .getByRole("button", { name: "Next", exact: true })
    .click();
  await expect(page).toHaveURL(/\/crosswalks\/[0-9a-f-]{36}\?.*step=map/, {
    timeout: LONG_WAIT,
  });
  await expect(_mappingTable(page)).toBeVisible({ timeout: LONG_WAIT });
}

/** Governs GENDER with the sex entry and translates Queens' M/F/U codes. */
async function _translateQueensSex(page: Page): Promise<void> {
  await _selectColumn(page, "GENDER");
  await _chooseOption(page, "Dictionary entry", "sex");
  // The entry change empties the layouts read this session.
  await _waitForLayoutValues(page);
  await page.getByText("A column", { exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "A column", exact: true }),
  ).toBeChecked();
  await _chooseOption(page, "Column", "sex");
  await _chooseOption(page, "Translate codes with", "Sex (M/F/U)");
  await expect(
    page.getByRole("radio", { name: "Codes", exact: true }),
  ).toBeChecked();
  await expect(_exampleTable(page)).toContainText("Male", {
    timeout: MEDIUM_WAIT,
  });
}

/** The reference layout picks the primary list for GENDER when it is read. */
async function _expectReferenceTranslates(
  page: Page,
  kingsLayoutName: string,
): Promise<void> {
  await _selectLayout(page, kingsLayoutName);
  await _selectColumn(page, "GENDER");
  await expect(
    page.getByRole("combobox", { name: "Translate codes with", exact: true }),
  ).toHaveValue("Sex (1/2/9)", { timeout: MEDIUM_WAIT });
}

/** Fills onset_dt from Queens' text dates, read as month/day/year. */
async function _readQueensOnsetAsDate(page: Page): Promise<void> {
  await _selectColumn(page, "onset_dt");
  await page.getByText("A column", { exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "A column", exact: true }),
  ).toBeChecked();
  await _chooseOption(page, "Column", "rash_onset");
  await _chooseOption(page, "Change the values", "Read as a date");
  // The format detected from the values fills in, so the dates convert.
  await expect(
    page.getByRole("combobox", { name: "Date format", exact: true }),
  ).toHaveValue("MM/DD/YYYY");
  await expect(
    _exampleTable(page)
      .getByRole("cell", { name: /^2026-03-\d{2}$/ })
      .first(),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/** Confirms Queens, names the combined dataset, and creates it. */
async function _createCombinedDataset(page: Page): Promise<void> {
  await _footer(page).getByRole("button", { name: "Confirm and next" }).click();
  await expect(page).toHaveURL(/step=combine/, { timeout: MEDIUM_WAIT });
  const nameInput = page.getByRole("textbox", { name: "Name", exact: true });
  await nameInput.fill(COMBINED_NAME);
  await expect(nameInput).toHaveValue(COMBINED_NAME);
  await expect(page.getByText("18 rows from 3 datasets")).toBeVisible({
    timeout: LONG_WAIT,
  });
  await _footer(page)
    .getByRole("button", { name: "Create combined dataset" })
    .click();
}

/** The combined dataset's page: labels, source column, tag, and rail. */
async function _expectCombinedDatasetPage(page: Page): Promise<void> {
  await expect(
    page.getByRole("columnheader", { name: "source_dataset", exact: true }),
  ).toBeVisible({ timeout: LONG_WAIT });
  await expect(
    page.getByRole("gridcell", { name: "Male", exact: true }).first(),
  ).toBeVisible({ timeout: LONG_WAIT });
  await expect(
    page.getByRole("gridcell", { name: "Female", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Code list for GENDER" }),
  ).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: CROSSWALK_NAME }),
  ).toBeVisible();
}

/** Waits for the crosswalk this test made to record its combined dataset. */
async function _waitForCombinedCrosswalk(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    startedAt: string;
  }>,
): Promise<CombinedCrosswalk> {
  let combined: CombinedCrosswalk | undefined;
  await expect
    .poll(
      async () => {
        const { data } = await options.admin
          .from("crosswalks")
          .select("output_dataset_id, compiled_code_lists")
          .eq("workspace_id", options.workspaceId)
          .gte("created_at", options.startedAt)
          .not("output_dataset_id", "is", null)
          .throwOnError();
        const row = data[0];
        combined = row?.output_dataset_id
          ? {
              outputDatasetId: row.output_dataset_id,
              compiledCodeListCount: (row.compiled_code_lists as unknown[])
                .length,
            }
          : undefined;
        return combined;
      },
      { timeout: LONG_WAIT },
    )
    .toBeDefined();
  return combined!;
}

/** The combined dataset's columns in order, and its one reference binding. */
async function _expectCombinedDatasetColumns(
  admin: AvaSupabaseDBClient,
  datasetId: string,
): Promise<void> {
  const { data: columns } = await admin
    .from("dataset_columns")
    .select("name")
    .eq("dataset_id", datasetId)
    .order("column_idx")
    .throwOnError();
  expect(
    columns.map((column) => {
      return column.name;
    }),
  ).toEqual(["source_dataset", "CaseNo", "GENDER", "onset_dt", "zip"]);
  const { data: bindings } = await admin
    .from("dataset_columns__dictionary_bindings")
    .select("mode")
    .eq("dataset_id", datasetId)
    .throwOnError();
  expect(
    bindings.map((binding) => {
      return binding.mode;
    }),
  ).toEqual(["reference"]);
}

async function _readDatasetName(
  admin: AvaSupabaseDBClient,
  datasetId: string,
): Promise<string> {
  const { data } = await admin
    .from("datasets")
    .select("name")
    .eq("id", datasetId)
    .single()
    .throwOnError();
  return data.name;
}

/** The seeded dictionary, and the line lists a test imports through the UI. */
type CrosswalkSourcesFixture = {
  admin: AvaSupabaseDBClient;
  workspaceId: string;
  /** When the test began, to find the crosswalk it creates. */
  startedAt: string;
  /** Signs in and imports the three line lists. */
  signInAndImport: () => Promise<SourceDatasets>;
};

/** Deletes the crosswalks this test made, then their combined datasets. */
async function _deleteCrosswalks(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    startedAt: string;
  }>,
): Promise<void> {
  const { admin, workspaceId } = options;
  const { data: crosswalks } = await admin
    .from("crosswalks")
    .select("id, output_dataset_id")
    .eq("workspace_id", workspaceId)
    .gte("created_at", options.startedAt)
    .throwOnError();
  if (crosswalks.length === 0) {
    return;
  }
  await admin
    .from("crosswalks")
    .delete()
    .in(
      "id",
      crosswalks.map((crosswalk) => {
        return crosswalk.id;
      }),
    )
    .throwOnError();
  for (const crosswalk of crosswalks) {
    if (crosswalk.output_dataset_id) {
      await deleteDatasetFixture({
        admin,
        datasetId: crosswalk.output_dataset_id,
        workspaceId,
      });
    }
  }
}

/**
 * Seeds the dictionary before the first page load. Afterwards it deletes
 * the crosswalks the test made (their layouts, columns, memberships, and
 * mappings cascade) and their combined datasets, the imports, then the
 * dictionary, whose children cascade.
 */
const test = base.extend<{ crosswalkSources: CrosswalkSourcesFixture }>({
  crosswalkSources: async ({ page, e2eWorkerDb }, use) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    const startedAt = new Date().toISOString();
    const dictionaryId = await seedDataDictionary({
      admin,
      workspaceId,
      name: DICTIONARY_NAME,
      entries: ENTRIES,
    });
    const importedIds: string[] = [];
    const importOne = async (filePath: string, rowCount: number) => {
      const id = await importDatasetViaUi({
        page,
        filePath,
        expectedRowCount: rowCount,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
        onDatasetCreated: (datasetId) => {
          importedIds.push(datasetId);
        },
      });
      return { id, name: await _readDatasetName(admin, id) };
    };
    const signInAndImport = async (): Promise<SourceDatasets> => {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      return {
        kingsMarch: await importOne(
          CROSSWALK_KINGS_MARCH_CSV_PATH,
          CROSSWALK_KINGS_CSV_EXPECTED_ROW_COUNT,
        ),
        kingsApril: await importOne(
          CROSSWALK_KINGS_APRIL_CSV_PATH,
          CROSSWALK_KINGS_CSV_EXPECTED_ROW_COUNT,
        ),
        queens: await importOne(
          CROSSWALK_QUEENS_MARCH_CSV_PATH,
          CROSSWALK_QUEENS_CSV_EXPECTED_ROW_COUNT,
        ),
      };
    };
    try {
      await use({ admin, workspaceId, startedAt, signInAndImport });
    } finally {
      await _deleteCrosswalks({ admin, workspaceId, startedAt });
      for (const datasetId of importedIds) {
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

test.describe("combining datasets with a crosswalk", () => {
  test("a combined dataset stacks both layouts with every code read as the primary list's label", async ({
    page,
    crosswalkSources,
  }) => {
    const sources = await crosswalkSources.signInAndImport();
    const [kingsLayoutName] = [
      sources.kingsMarch.name,
      sources.kingsApril.name,
    ].sort((nameA, nameB) => {
      return nameA.localeCompare(nameB);
    });

    await _addDatasets(page, sources);
    await _chooseReferenceAndMap(page, kingsLayoutName!);
    // Step 2 may open on either layout; map Queens first.
    await _selectLayout(page, sources.queens.name);
    await _translateQueensSex(page);
    await _expectReferenceTranslates(page, kingsLayoutName!);
    await _selectLayout(page, sources.queens.name);
    await _readQueensOnsetAsDate(page);
    await _createCombinedDataset(page);

    const combined = await _waitForCombinedCrosswalk(crosswalkSources);
    await expect(page).toHaveURL(new RegExp(combined.outputDatasetId), {
      timeout: LONG_WAIT,
    });
    await _expectCombinedDatasetPage(page);
    // Both sex lists were embedded: 1/2/9 for Kings and as the primary list
    // Queens' M/F/U codes are reconciled to, and M/F/U itself.
    expect(combined.compiledCodeListCount).toBe(2);
    await _expectCombinedDatasetColumns(
      crosswalkSources.admin,
      combined.outputDatasetId,
    );
  });
});
