import { makeCrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import { makeInitialCrosswalkState } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { CrosswalkCatalog } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";

/** The reference dataset. */
export const KINGS_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
/** The two datasets of the Queens layout. */
export const QUEENS_MARCH_ID =
  "22222222-2222-4222-8222-222222222222" as Dataset.Id;
export const QUEENS_APRIL_ID =
  "33333333-3333-4333-8333-333333333333" as Dataset.Id;
/** The one dataset of the Bronx layout. */
export const BRONX_ID = "44444444-4444-4444-8444-444444444444" as Dataset.Id;

export const REFERENCE_LAYOUT_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as CrosswalkLayout.Id;
export const QUEENS_LAYOUT_ID =
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as CrosswalkLayout.Id;
export const BRONX_LAYOUT_ID =
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc" as CrosswalkLayout.Id;

export const SEX_ENTRY_ID =
  "dddddddd-dddd-4ddd-8ddd-dddddddddddd" as DataDictionaryEntry.Id;
export const SEX_CODES_LIST_ID =
  "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" as DataDictionaryCodeList.Id;
export const SEX_LETTERS_LIST_ID =
  "ffffffff-ffff-4fff-8fff-ffffffffffff" as DataDictionaryCodeList.Id;
export const NYS_DICTIONARY_ID =
  "99999999-9999-4999-8999-999999999999" as DataDictionary.Id;

function _pair(
  code: string,
  label: string,
  isMissing = false,
): DataDictionaryCodeList.Pair {
  return { code, label, acceptedSpellings: [], isMissing };
}

/** A sex entry: `1/2/9` primary, then `M/F/U`. */
export const SEX_ENTRY: DictionaryMatch.Entry = {
  dictionaryId: NYS_DICTIONARY_ID,
  dictionaryRank: 0,
  entryId: SEX_ENTRY_ID,
  entryName: "sex",
  columnNames: ["sex"],
  kind: "categorical",
  position: 0,
  codeLists: [
    {
      id: SEX_CODES_LIST_ID,
      name: "Sex (1/2/9)",
      pairs: [
        _pair("1", "Male"),
        _pair("2", "Female"),
        _pair("9", "Unknown", true),
      ],
    },
    {
      id: SEX_LETTERS_LIST_ID,
      name: "Sex (M/F/U)",
      pairs: [
        _pair("M", "Male"),
        _pair("F", "Female"),
        _pair("U", "Unknown", true),
      ],
    },
  ],
};

export const CASE_ID_COLUMN: CrosswalkDraft.Column = {
  id: "c0000000-0000-4000-8000-000000000001" as CrosswalkColumn.Id,
  name: "case_id",
  position: 0,
  dataType: "varchar",
  entryId: undefined,
};
export const SEX_COLUMN: CrosswalkDraft.Column = {
  id: "c0000000-0000-4000-8000-000000000002" as CrosswalkColumn.Id,
  name: "sex",
  position: 1,
  dataType: "varchar",
  entryId: SEX_ENTRY_ID,
};
export const ONSET_COLUMN: CrosswalkDraft.Column = {
  id: "c0000000-0000-4000-8000-000000000003" as CrosswalkColumn.Id,
  name: "rash_onset_date",
  position: 2,
  dataType: "date",
  entryId: undefined,
};

function _columns(
  columns: ReadonlyArray<[string, AvaDataType.T]>,
): CrosswalkLayout.Dataset["columns"] {
  return columns.map(([name, dataType]) => {
    return { name, dataType };
  });
}

const QUEENS_COLUMNS = _columns([
  ["CaseNo", "varchar"],
  ["GENDER", "bigint"],
  ["onset_dt", "varchar"],
  ["age_mo", "bigint"],
]);

/** Every dataset the fixtures' layouts hold. */
export const DATASETS_BY_ID: ReadonlyMap<string, CrosswalkLayout.Dataset> =
  new Map([
    [
      KINGS_ID,
      {
        id: KINGS_ID,
        name: "Kings line list",
        columns: _columns([
          ["case_id", "varchar"],
          ["sex", "varchar"],
          ["rash_onset_date", "date"],
        ]),
      },
    ],
    [
      QUEENS_MARCH_ID,
      { id: QUEENS_MARCH_ID, name: "Queens 2026-03", columns: QUEENS_COLUMNS },
    ],
    [
      QUEENS_APRIL_ID,
      { id: QUEENS_APRIL_ID, name: "Queens 2026-04", columns: QUEENS_COLUMNS },
    ],
    [
      BRONX_ID,
      {
        id: BRONX_ID,
        name: "Bronx cases",
        columns: _columns([
          ["id", "varchar"],
          ["sex_cd", "varchar"],
        ]),
      },
    ],
  ]);

/** The catalog the reducer and the pane read. */
export const CONTEXT: CrosswalkContext = {
  datasetsById: DATASETS_BY_ID,
  entriesById: new Map([[SEX_ENTRY_ID, SEX_ENTRY]]),
};

/** A fill that reads a source column. */
type ColumnFill = Extract<CrosswalkMapping.Fill, { kind: "column" }>;

/** A column fill with no conversion and no translation. */
export function columnFill(sourceColumn: string): ColumnFill {
  return {
    kind: "column",
    sourceColumn,
    convert: undefined,
    codeListId: undefined,
    holdsLabels: false,
  };
}

/** Queens's GENDER, translated with the `1/2/9` list. */
export const GENDER_FILL: ColumnFill = {
  ...columnFill("GENDER"),
  codeListId: SEX_CODES_LIST_ID,
};

function _mapping(
  id: string,
  fill: CrosswalkMapping.Fill,
  status: CrosswalkMapping.Status,
): CrosswalkDraft.Mapping {
  return {
    id: id as CrosswalkDraft.Mapping["id"],
    fill,
    status,
    confidence: undefined,
    reason: undefined,
  };
}

function _layouts(): CrosswalkDraft.Layout[] {
  return [
    {
      id: REFERENCE_LAYOUT_ID,
      key: "case_id\u001frash_onset_date\u001fsex",
      signature: "l1.reference",
      columnNames: ["case_id", "sex", "rash_onset_date"],
      isReference: true,
      status: "mapped",
      datasetIds: [KINGS_ID],
    },
    {
      id: QUEENS_LAYOUT_ID,
      key: "age_mo\u001fcaseno\u001fgender\u001fonset_dt",
      signature: "l1.queens",
      columnNames: ["CaseNo", "GENDER", "onset_dt", "age_mo"],
      isReference: false,
      status: "review",
      datasetIds: [QUEENS_MARCH_ID, QUEENS_APRIL_ID],
    },
    {
      id: BRONX_LAYOUT_ID,
      key: "id\u001fsex_cd",
      signature: "l1.bronx",
      columnNames: ["id", "sex_cd"],
      isReference: false,
      status: "to_do",
      datasetIds: [BRONX_ID],
    },
  ];
}

function _mappings(): CrosswalkDraft.T["mappings"] {
  return {
    [REFERENCE_LAYOUT_ID]: {
      [CASE_ID_COLUMN.id]: _mapping(
        "m-ref-1",
        columnFill("case_id"),
        "confirmed",
      ),
      [SEX_COLUMN.id]: _mapping(
        "m-ref-2",
        { ...columnFill("sex"), codeListId: SEX_CODES_LIST_ID },
        "confirmed",
      ),
      [ONSET_COLUMN.id]: _mapping(
        "m-ref-3",
        columnFill("rash_onset_date"),
        "confirmed",
      ),
    },
    [QUEENS_LAYOUT_ID]: {
      [CASE_ID_COLUMN.id]: {
        ..._mapping("m-q-1", columnFill("CaseNo"), "confirmed"),
        confidence: 0.92,
        reason: "name_and_type",
      },
      [SEX_COLUMN.id]: {
        ..._mapping("m-q-2", GENDER_FILL, "suggested"),
        confidence: 0.81,
        reason: "same_values",
      },
    },
    [BRONX_LAYOUT_ID]: {},
  };
}

/** The fixtures' crosswalk, saved, with three layouts and three columns. */
export function makeDraft(
  overrides: Partial<CrosswalkDraft.T> = {},
): CrosswalkDraft.T {
  return {
    crosswalkId: "12121212-1212-4121-8121-121212121212" as Crosswalk.Id,
    isSaved: true,
    name: "Measles line lists",
    description: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
    outputDatasetId: undefined,
    columns: [CASE_ID_COLUMN, SEX_COLUMN, ONSET_COLUMN],
    layouts: _layouts(),
    mappings: _mappings(),
    ...overrides,
  };
}

/** The draft with one layout's fill for one column replaced. */
export function withFill(
  draft: CrosswalkDraft.T,
  options: Readonly<{
    layoutId: CrosswalkLayout.Id;
    columnId: CrosswalkColumn.Id;
    fill: CrosswalkMapping.Fill;
    status?: CrosswalkMapping.Status;
  }>,
): CrosswalkDraft.T {
  const layoutMappings = draft.mappings[options.layoutId] ?? {};
  return {
    ...draft,
    mappings: {
      ...draft.mappings,
      [options.layoutId]: {
        ...layoutMappings,
        [options.columnId]: _mapping(
          `m-${options.columnId}`,
          options.fill,
          options.status ?? "confirmed",
        ),
      },
    },
  };
}

/** A Queens profile listing `values`, one row each. */
export function makeProfile(
  columnName: string,
  dataType: AvaDataType.T,
  values: readonly string[],
): ColumnProfile.T {
  return {
    datasetId: QUEENS_MARCH_ID,
    datasetName: "Queens 2026-03",
    columnName,
    dataType,
    rowCount: values.length,
    nonNullCount: values.length,
    distinctCount: values.length,
    values: values.map((value) => {
      return { value, rowCount: 1 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

/** What reading the Queens layout's values found. */
export const QUEENS_PROFILES: ReadonlyMap<string, ColumnProfile.T> = new Map([
  ["CaseNo", makeProfile("CaseNo", "varchar", ["Q-101", "Q-102"])],
  ["GENDER", makeProfile("GENDER", "bigint", ["1", "2"])],
  ["onset_dt", makeProfile("onset_dt", "varchar", ["03/14/2026"])],
  ["age_mo", makeProfile("age_mo", "bigint", ["18", "30"])],
]);

/** The date format detected for each Queens text column that holds dates. */
export const QUEENS_DATE_FORMATS: ReadonlyMap<string, string> = new Map([
  ["onset_dt", "%m/%d/%Y"],
]);

/**
 * A flow on step 2 over `draft`, saved as it is, with every callback a mock
 * from `makeCrosswalkFlow`: `save`, `dispatchAndSave`, and `selectLayout`
 * resolve as a successful save would.
 */
export function makeFlow(
  draft: CrosswalkDraft.T = makeDraft(),
  overrides: Partial<CrosswalkFlow> = {},
): CrosswalkFlow {
  return makeCrosswalkFlow({
    state: makeInitialCrosswalkState(draft, { isSaved: true }),
    step: "map",
    reachableSteps: new Set(["datasets", "map", "combine"]),
    ...overrides,
  });
}

/** The catalog every step receives, over `CONTEXT`, finished loading. */
export function makeCatalog(): CrosswalkCatalog {
  return {
    context: CONTEXT,
    bindingsByDatasetId: new Map(),
    columnNameById: new Map(),
    isLoading: false,
  };
}
