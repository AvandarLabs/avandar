import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/** The combined dataset's columns. */
export const CASE_ID =
  "c0000000-0000-4000-8000-000000000001" as CrosswalkColumn.Id;
export const SEX = "c0000000-0000-4000-8000-000000000002" as CrosswalkColumn.Id;
export const DOB = "c0000000-0000-4000-8000-000000000003" as CrosswalkColumn.Id;

/** The reference layout (Kings) and the layout being mapped (Queens). */
export const REFERENCE_LAYOUT =
  "a0000000-0000-4000-8000-000000000001" as CrosswalkLayout.Id;
export const QUEENS_LAYOUT =
  "a0000000-0000-4000-8000-000000000002" as CrosswalkLayout.Id;

export const KINGS_DATASET =
  "d0000000-0000-4000-8000-000000000001" as Dataset.Id;
export const QUEENS_DATASET =
  "d0000000-0000-4000-8000-000000000002" as Dataset.Id;

/** The dictionary entry the `sex` column is governed by. */
export const SEX_ENTRY =
  "e0000000-0000-4000-8000-000000000001" as DataDictionaryEntry.Id;

/** A profile of 400 rows: listed codes when given, otherwise unique per row. */
export function makeProfile(
  options: Readonly<{
    datasetId: Dataset.Id;
    columnName: string;
    dataType: AvaDataType.T;
    codes?: readonly string[];
  }>,
): ColumnProfile.T {
  return {
    datasetId: options.datasetId,
    datasetName: options.datasetId === KINGS_DATASET ? "Kings" : "Queens",
    columnName: options.columnName,
    dataType: options.dataType,
    rowCount: 400,
    nonNullCount: 400,
    distinctCount: options.codes?.length ?? 400,
    values: options.codes?.map((value) => {
      return { value, rowCount: 400 / options.codes!.length };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

/** A confirmed fill from a source column with no conversion. */
export function makeColumnFill(sourceColumn: string): CrosswalkMapping.Fill {
  return {
    kind: "column",
    sourceColumn,
    convert: undefined,
    codeListId: undefined,
    holdsLabels: false,
  };
}

function _confirmed(id: string, sourceColumn: string): CrosswalkDraft.Mapping {
  return {
    id: id as CrosswalkMapping.Id,
    fill: makeColumnFill(sourceColumn),
    status: "confirmed",
    confidence: 1,
    reason: "name_and_type",
  };
}

/**
 * A crosswalk with three columns, `case_id`, `sex` (governed), and `dob`,
 * a mapped Kings reference layout, and a Queens layout whose only fill is
 * `case_id` from `CaseNo`.
 */
export function makeMeaningDraft(): CrosswalkDraft.T {
  return {
    crosswalkId: "f0000000-0000-4000-8000-000000000001" as Crosswalk.Id,
    isSaved: true,
    name: "Measles line lists",
    description: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
    outputDatasetId: undefined,
    columns: [
      {
        id: CASE_ID,
        name: "case_id",
        position: 0,
        dataType: "varchar",
        entryId: undefined,
      },
      {
        id: SEX,
        name: "sex",
        position: 1,
        dataType: "varchar",
        entryId: SEX_ENTRY,
      },
      {
        id: DOB,
        name: "dob",
        position: 2,
        dataType: "date",
        entryId: undefined,
      },
    ],
    layouts: [
      {
        id: REFERENCE_LAYOUT,
        key: "case_id\u001fdob\u001fsex",
        signature: "l1.reference",
        columnNames: ["case_id", "sex", "dob"],
        isReference: true,
        status: "mapped",
        datasetIds: [KINGS_DATASET],
      },
      {
        id: QUEENS_LAYOUT,
        key: "birth_date\u001fcaseno\u001fgender\u001fpatient_name",
        signature: "l1.queens",
        columnNames: ["CaseNo", "GENDER", "birth_date", "patient_name"],
        isReference: false,
        status: "to_do",
        datasetIds: [QUEENS_DATASET],
      },
    ],
    mappings: {
      [REFERENCE_LAYOUT]: {
        [CASE_ID]: _confirmed(
          "b0000000-0000-4000-8000-000000000001",
          "case_id",
        ),
        [SEX]: _confirmed("b0000000-0000-4000-8000-000000000002", "sex"),
        [DOB]: _confirmed("b0000000-0000-4000-8000-000000000003", "dob"),
      },
      [QUEENS_LAYOUT]: {
        [CASE_ID]: _confirmed("b0000000-0000-4000-8000-000000000004", "CaseNo"),
      },
    },
  };
}

/**
 * Both datasets' columns, and no dictionary entries. Shaped like the
 * crosswalk view's `CrosswalkContext`, which it is passed as, without
 * importing a view type into `src/lib`.
 */
export const MEANING_CONTEXT: {
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  entriesById: ReadonlyMap<string, DictionaryMatch.Entry>;
} = {
  datasetsById: new Map([
    [
      KINGS_DATASET,
      {
        id: KINGS_DATASET,
        name: "Kings line list",
        columns: [
          { name: "case_id", dataType: "varchar" },
          { name: "sex", dataType: "varchar" },
          { name: "dob", dataType: "date" },
        ],
      },
    ],
    [
      QUEENS_DATASET,
      {
        id: QUEENS_DATASET,
        name: "Queens line list",
        columns: [
          { name: "CaseNo", dataType: "bigint" },
          { name: "GENDER", dataType: "bigint" },
          { name: "birth_date", dataType: "varchar" },
          { name: "patient_name", dataType: "varchar" },
        ],
      },
    ],
  ]),
  entriesById: new Map(),
};

/** The reference columns' profiles, as `useLayoutValues` builds them. */
export const MEANING_TARGETS: readonly CrosswalkMatch.Target[] = [
  {
    columnId: CASE_ID,
    profile: makeProfile({
      datasetId: KINGS_DATASET,
      columnName: "case_id",
      dataType: "varchar",
    }),
  },
  {
    columnId: SEX,
    profile: makeProfile({
      datasetId: KINGS_DATASET,
      columnName: "sex",
      dataType: "varchar",
      codes: ["Male", "Female"],
    }),
  },
  {
    columnId: DOB,
    profile: makeProfile({
      datasetId: KINGS_DATASET,
      columnName: "dob",
      dataType: "date",
    }),
  },
];

/** The Queens layout's profiles, as `useLayoutValues` reads them. */
export const MEANING_SOURCES: readonly ColumnProfile.T[] = [
  makeProfile({
    datasetId: QUEENS_DATASET,
    columnName: "CaseNo",
    dataType: "bigint",
  }),
  makeProfile({
    datasetId: QUEENS_DATASET,
    columnName: "GENDER",
    dataType: "bigint",
    codes: ["1", "2"],
  }),
  makeProfile({
    datasetId: QUEENS_DATASET,
    columnName: "birth_date",
    dataType: "varchar",
  }),
  makeProfile({
    datasetId: QUEENS_DATASET,
    columnName: "patient_name",
    dataType: "varchar",
  }),
];

/** The Queens profiles by column name, as `useLayoutValues` returns them. */
export const MEANING_SOURCES_BY_NAME: ReadonlyMap<string, ColumnProfile.T> =
  new Map(
    MEANING_SOURCES.map((profile) => {
      return [profile.columnName, profile];
    }),
  );
