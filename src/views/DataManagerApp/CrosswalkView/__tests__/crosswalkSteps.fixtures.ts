import { Model } from "@avandar/models";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import {
  BRONX,
  CROSSWALK_ID,
  KINGS_APRIL,
  KINGS_MARCH,
  SEX_CODES_ID,
  SEX_ENTRY_ID,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import { makeInitialCrosswalkState } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkState } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

/** A catalog dataset as the workspace's dataset list returns it. */
export function toDatasetRecord(dataset: CrosswalkLayout.Dataset): Dataset.T {
  return Model.make("Dataset", {
    id: dataset.id,
    name: dataset.name,
    sourceType: "csv_file",
    workspaceId:
      "00000000-0000-4000-8000-000000000001" as Dataset.T["workspaceId"],
    ownerId: "00000000-0000-4000-8000-000000000003" as Dataset.T["ownerId"],
    ownerProfileId:
      "00000000-0000-4000-8000-000000000004" as Dataset.T["ownerProfileId"],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
  });
}

export const BRONX_LAYOUT_ID =
  "10000000-0000-4000-8000-000000000001" as CrosswalkLayout.Id;
export const KINGS_LAYOUT_ID =
  "10000000-0000-4000-8000-000000000002" as CrosswalkLayout.Id;

/** A layout of `datasets`, named by its first dataset's columns. */
function _layout(
  id: CrosswalkLayout.Id,
  datasets: readonly CrosswalkLayout.Dataset[],
  options: { isReference: boolean; status: CrosswalkLayout.Status },
): CrosswalkDraft.Layout {
  const columnNames = (datasets[0]?.columns ?? []).map((column) => {
    return column.name;
  });
  return {
    id,
    key: CrosswalkLayout.buildLayoutKey(columnNames),
    signature: CrosswalkLayout.buildSignature(columnNames),
    columnNames,
    isReference: options.isReference,
    status: options.status,
    datasetIds: datasets.map((dataset) => {
      return dataset.id;
    }),
  };
}

/** The reference layout: Bronx alone (case_id, sex, county). */
export const BRONX_LAYOUT = _layout(BRONX_LAYOUT_ID, [BRONX], {
  isReference: true,
  status: "mapped",
});

/**
 * Kings March and April, which share a layout. Its column names are
 * March's (`case_id`); April spells that column `CASE_ID`.
 */
export const KINGS_LAYOUT = _layout(
  KINGS_LAYOUT_ID,
  [KINGS_MARCH, KINGS_APRIL],
  { isReference: false, status: "review" },
);

function _column(
  index: number,
  name: string,
  dataType: CrosswalkDraft.Column["dataType"],
  entryId?: DataDictionaryEntry.Id,
): CrosswalkDraft.Column {
  return {
    id: `50000000-0000-4000-8000-00000000000${index}` as CrosswalkColumn.Id,
    name,
    position: index,
    dataType,
    entryId,
  };
}

export const CASE_COLUMN = _column(0, "case_id", "varchar");
export const SEX_COLUMN = _column(1, "sex", "varchar", SEX_ENTRY_ID);
export const COUNTY_COLUMN = _column(2, "county", "varchar");
/** A column the user added: Bronx has no onset date. */
export const ONSET_COLUMN = _column(3, "rash_onset_date", "date");
/** Seeded from Bronx, then the added onset date. */
export const COLUMNS = [CASE_COLUMN, SEX_COLUMN, COUNTY_COLUMN, ONSET_COLUMN];

/** A `column` fill reading `sourceColumn`, with any field overridden. */
export function makeColumnFill(
  sourceColumn: string,
  overrides: Partial<Extract<CrosswalkMapping.Fill, { kind: "column" }>> = {},
): CrosswalkMapping.Fill {
  return {
    kind: "column",
    sourceColumn,
    convert: undefined,
    codeListId: undefined,
    holdsLabels: false,
    ...overrides,
  };
}

let mappingCount = 0;

/** A confirmed mapping with a fresh id, with any field overridden. */
export function makeMapping(
  fill: CrosswalkMapping.Fill,
  overrides: Partial<Omit<CrosswalkDraft.Mapping, "id" | "fill">> = {},
): CrosswalkDraft.Mapping {
  mappingCount += 1;
  const suffix = String(mappingCount).padStart(12, "0");
  return {
    id: `60000000-0000-4000-8000-${suffix}` as CrosswalkMapping.Id,
    fill,
    status: "confirmed",
    confidence: undefined,
    reason: undefined,
    ...overrides,
  };
}

function _baseDraft(): CrosswalkDraft.T {
  return {
    crosswalkId: CROSSWALK_ID,
    isSaved: true,
    name: "Measles line lists",
    description: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
    outputDatasetId: undefined,
    columns: [],
    layouts: [],
    mappings: {},
  };
}

/** A saved crosswalk with no dataset yet. */
export function makeEmptyDraft(
  overrides: Partial<CrosswalkDraft.T> = {},
): CrosswalkDraft.T {
  return { ..._baseDraft(), ...overrides };
}

/** Bronx (the reference) and Kings, with no columns seeded yet. */
export function makeLayoutsDraft(
  overrides: Partial<CrosswalkDraft.T> = {},
): CrosswalkDraft.T {
  return {
    ..._baseDraft(),
    layouts: [BRONX_LAYOUT, { ...KINGS_LAYOUT, status: "to_do" }],
    ...overrides,
  };
}

/**
 * Columns seeded from Bronx plus the added onset date, identity fills on
 * Bronx, and on Kings: a confirmed name match, a suggested code
 * translation, a date read, and county not filled yet.
 */
export function makeMappedDraft(
  overrides: Partial<CrosswalkDraft.T> = {},
): CrosswalkDraft.T {
  return {
    ..._baseDraft(),
    columns: COLUMNS,
    layouts: [BRONX_LAYOUT, KINGS_LAYOUT],
    mappings: {
      [BRONX_LAYOUT_ID]: {
        [CASE_COLUMN.id]: makeMapping(makeColumnFill("case_id")),
        [SEX_COLUMN.id]: makeMapping(
          makeColumnFill("sex", { codeListId: SEX_CODES_ID }),
        ),
        [COUNTY_COLUMN.id]: makeMapping(makeColumnFill("county")),
      },
      [KINGS_LAYOUT_ID]: {
        [CASE_COLUMN.id]: makeMapping(makeColumnFill("case_id"), {
          reason: "name_and_type",
          confidence: 1,
        }),
        [SEX_COLUMN.id]: makeMapping(
          makeColumnFill("GENDER", { codeListId: SEX_CODES_ID }),
          { status: "suggested", reason: "same_values", confidence: 0.91 },
        ),
        [ONSET_COLUMN.id]: makeMapping(
          makeColumnFill("onset_dt", {
            convert: { kind: "parse_date", format: "%m/%d/%Y" },
          }),
        ),
      },
    },
    ...overrides,
  };
}

/**
 * The reducer's starting state for `draft` (saved as it is when the draft
 * is saved), with any field overridden.
 */
export function makeStateFromDraft(
  draft: CrosswalkDraft.T,
  overrides: Partial<CrosswalkState> = {},
): CrosswalkState {
  return {
    ...makeInitialCrosswalkState(draft, { isSaved: draft.isSaved }),
    ...overrides,
  };
}
