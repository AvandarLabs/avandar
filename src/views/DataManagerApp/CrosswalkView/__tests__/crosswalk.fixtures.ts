import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import {
  crosswalkReducer,
  makeInitialCrosswalkState,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  CrosswalkContext,
  CrosswalkState,
  ReferenceColumnBinding,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

/** The crosswalk every fixture belongs to. */
export const CROSSWALK_ID =
  "cccccccc-0000-4000-8000-000000000001" as Crosswalk.Id;

/** The reference-shaped dataset: case_id, sex, county. */
export const BRONX: CrosswalkLayout.Dataset = {
  id: "dddddddd-0000-4000-8000-000000000001" as Dataset.Id,
  name: "Bronx line list",
  columns: [
    { name: "case_id", dataType: "varchar" },
    { name: "sex", dataType: "varchar" },
    { name: "county", dataType: "varchar" },
  ],
};

/** One of two datasets sharing a layout: case_id, GENDER, county, onset_dt. */
export const KINGS_MARCH: CrosswalkLayout.Dataset = {
  id: "dddddddd-0000-4000-8000-000000000002" as Dataset.Id,
  name: "Kings line list 2026-03",
  columns: [
    { name: "case_id", dataType: "varchar" },
    { name: "GENDER", dataType: "bigint" },
    { name: "county", dataType: "varchar" },
    { name: "onset_dt", dataType: "varchar" },
  ],
};

/** The same layout as March, with `CASE_ID` spelled in capitals. */
export const KINGS_APRIL: CrosswalkLayout.Dataset = {
  id: "dddddddd-0000-4000-8000-000000000003" as Dataset.Id,
  name: "Kings line list 2026-04",
  columns: [
    { name: "CASE_ID", dataType: "varchar" },
    { name: "GENDER", dataType: "bigint" },
    { name: "county", dataType: "varchar" },
    { name: "onset_dt", dataType: "varchar" },
  ],
};

/** A layout with little in common with the others. */
export const QUEENS: CrosswalkLayout.Dataset = {
  id: "dddddddd-0000-4000-8000-000000000004" as Dataset.Id,
  name: "Queens cases",
  columns: [
    { name: "id", dataType: "bigint" },
    { name: "zip", dataType: "varchar" },
  ],
};

/** A new layout close to Kings: three of its four columns. */
export const KINGS_MAY: CrosswalkLayout.Dataset = {
  id: "dddddddd-0000-4000-8000-000000000005" as Dataset.Id,
  name: "Kings line list 2026-05",
  columns: [
    { name: "case_id", dataType: "varchar" },
    { name: "GENDER", dataType: "bigint" },
    { name: "county", dataType: "varchar" },
  ],
};

/** The four datasets most tests add. */
export const STARTING_DATASETS = [
  BRONX,
  KINGS_MARCH,
  KINGS_APRIL,
  QUEENS,
] as const;

/** The dictionary the sex entry belongs to. */
export const NYS_ID =
  "eeeeeeee-0000-4000-8000-000000000001" as DataDictionary.Id;
/** The sex entry. */
export const SEX_ENTRY_ID =
  "eeeeeeee-0000-4000-8000-000000000002" as DataDictionaryEntry.Id;
/** `1 Male`, `2 Female`, `9 Unknown`: the primary list. */
export const SEX_CODES_ID =
  "eeeeeeee-0000-4000-8000-000000000003" as DataDictionaryCodeList.Id;
/** `M Male`, `F Female`, `U Unknown`. */
export const SEX_LETTERS_ID =
  "eeeeeeee-0000-4000-8000-000000000004" as DataDictionaryCodeList.Id;

/** The sex entry, primary list first. */
export const SEX_ENTRY: DictionaryMatch.Entry = {
  dictionaryId: NYS_ID,
  dictionaryRank: 0,
  entryId: SEX_ENTRY_ID,
  entryName: "sex",
  columnNames: ["sex"],
  kind: "categorical",
  position: 0,
  codeLists: [
    {
      id: SEX_CODES_ID,
      name: "Sex (1/2/9)",
      pairs: [
        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
        { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
        { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
      ],
    },
    {
      id: SEX_LETTERS_ID,
      name: "Sex (M/F/U)",
      pairs: [
        { code: "M", label: "Male", acceptedSpellings: [], isMissing: false },
        { code: "F", label: "Female", acceptedSpellings: [], isMissing: false },
        { code: "U", label: "Unknown", acceptedSpellings: [], isMissing: true },
      ],
    },
  ],
};

/** A context holding `datasets` and the sex entry. */
export function makeContext(
  datasets: readonly CrosswalkLayout.Dataset[] = [
    ...STARTING_DATASETS,
    KINGS_MAY,
  ],
): CrosswalkContext {
  return {
    datasetsById: new Map(
      datasets.map((dataset) => {
        return [dataset.id, dataset] as const;
      }),
    ),
    entriesById: new Map([[SEX_ENTRY_ID, SEX_ENTRY]]),
  };
}

/** The context most tests use: every fixture dataset. */
export const CONTEXT = makeContext();

/** The reference dataset's sex column, bound to the primary list. */
export const SEX_BINDINGS: ReadonlyMap<string, ReferenceColumnBinding> =
  new Map([
    [
      "sex",
      { entryId: SEX_ENTRY_ID, codeListId: SEX_CODES_ID, holdsLabels: false },
    ],
  ]);

/** A profile of one column, with `values` listed when given. */
export function makeProfile(
  options: Readonly<{
    dataset: CrosswalkLayout.Dataset;
    columnName: string;
    dataType: AvaDataType.T;
    values?: readonly string[];
  }>,
): ColumnProfile.T {
  const values = options.values?.map((value) => {
    return { value, rowCount: 10 };
  });
  const rowCount = (values?.length ?? 0) * 10;
  return {
    datasetId: options.dataset.id,
    datasetName: options.dataset.name,
    columnName: options.columnName,
    dataType: options.dataType,
    rowCount,
    nonNullCount: rowCount,
    distinctCount: values?.length ?? 0,
    values,
    dateShare: undefined,
    numberRange: undefined,
  };
}

/** The layout that holds `datasetId`; throws when none does. */
export function getLayoutOf(
  state: CrosswalkState,
  datasetId: Dataset.Id,
): CrosswalkDraft.Layout {
  const layout = state.draft.layouts.find((candidate) => {
    return candidate.datasetIds.includes(datasetId);
  });
  if (!layout) {
    throw new Error(`No layout holds ${datasetId}`);
  }
  return layout;
}

/** The column of the combined dataset named `name`; throws when none is. */
export function getColumn(
  state: CrosswalkState,
  name: string,
): CrosswalkDraft.Column {
  const column = state.draft.columns.find((candidate) => {
    return candidate.name === name;
  });
  if (!column) {
    throw new Error(`No column is named ${name}`);
  }
  return column;
}

/**
 * A new crosswalk with the starting datasets added and Bronx as the
 * reference.
 */
export function makeAddedState(): CrosswalkState {
  const empty = makeInitialCrosswalkState(
    CrosswalkDraft.makeEmpty({
      crosswalkId: CROSSWALK_ID,
      name: "Measles line lists",
    }),
    { isSaved: false },
  );
  const added = crosswalkReducer(empty, {
    type: "datasets_added",
    datasetIds: STARTING_DATASETS.map((dataset) => {
      return dataset.id;
    }),
    context: CONTEXT,
  });
  return crosswalkReducer(added, {
    type: "reference_chosen",
    layoutId: getLayoutOf(added, BRONX.id).id,
  });
}

/** `makeAddedState` with the columns seeded from Bronx. */
export function makeSeededState(
  bindings: ReadonlyMap<string, ReferenceColumnBinding> = SEX_BINDINGS,
): CrosswalkState {
  return crosswalkReducer(makeAddedState(), {
    type: "columns_seeded",
    bindingsByColumnName: bindings,
    context: CONTEXT,
  });
}
