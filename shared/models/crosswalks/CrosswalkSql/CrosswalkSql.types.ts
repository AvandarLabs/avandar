import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk.ts";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.ts";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.ts";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

/** One column of the combined dataset as the compiler sees it. */
export type CrosswalkSqlColumn = {
  id: CrosswalkColumn.Id;
  name: string;
  dataType: AvaDataType.T;
  entryId: DataDictionaryEntry.Id | undefined;
};

/** One layout as the compiler sees it. Skipped layouts are never passed. */
export type CrosswalkSqlLayout = {
  layoutId: CrosswalkLayout.Id;
  /** Sorted by name; at least one. */
  datasets: ReadonlyArray<{ id: Dataset.Id; name: string }>;
  /** By column id. A column with no fill becomes a typed NULL. */
  fillsByColumnId: ReadonlyMap<string, CrosswalkMapping.Fill>;
};

/** The code lists a compile may embed, by id, and each entry's primary list. */
export type CrosswalkSqlCodeLists = {
  codeListsById: ReadonlyMap<
    string,
    { pairs: readonly DataDictionaryCodeList.Pair[] }
  >;
  primaryCodeListIdByEntryId: ReadonlyMap<string, string>;
};

/** Everything `CrosswalkSql.compile` reads. */
export type CrosswalkSqlInput = CrosswalkSqlCodeLists & {
  codesOutputAs: Crosswalk.CodesOutput;
  /** "source_dataset" when the crosswalk adds one, otherwise undefined. */
  sourceColumnName: string | undefined;
  /** In position order. */
  columns: readonly CrosswalkSqlColumn[];
  layouts: readonly CrosswalkSqlLayout[];
};

/** The combined dataset's SQL, its columns, and the code lists it embedded. */
export type CrosswalkSqlOutput = {
  sql: string;
  /** Output order: the source column first when added. */
  columns: Array<{ name: string; dataType: AvaDataType.T }>;
  /** Every code list a translation embedded, sorted. */
  usedCodeListIds: string[];
};

/** One pair of a fill's code list, and what a translation outputs for it. */
export type CrosswalkSqlTranslationOutput = {
  pair: DataDictionaryCodeList.Pair;
  /**
   * The primary list's label (labels mode) or code (codes mode). Undefined
   * in codes mode when the primary list has no counterpart.
   */
  output: string | undefined;
};
