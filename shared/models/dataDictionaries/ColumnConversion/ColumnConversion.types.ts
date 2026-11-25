import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";

/** What a convert binding does to one dataset column when it loads. */
export type ColumnConversionT = {
  /** The converted column */
  datasetColumnId: string;

  /** Which side of each pair the stored values hold */
  direction: DictionaryBinding.Direction;

  /** The live list's pairs, or the pinned pairs */
  pairs: readonly DataDictionaryCodeList.Pair[];

  /** Whether the pairs are levels of a scale, kept in order */
  isOrdered: boolean;

  /** How each value no pair matches is resolved */
  overrides: readonly DictionaryBinding.ValueOverride[];

  /** The `<column>_original` copy's current name, when one is kept */
  keepsOriginalAs: string | undefined;

  /** The converted column's stored `data_type`: `bigint` or `varchar` */
  outputDataType: "bigint" | "varchar";

  /**
   * The column's `data_type` before the conversion, which the stored values
   * are cast to before they are converted (the binding's
   * `replacedDataType`). Undefined when the binding did not record one.
   */
  inputDataType: AvaDataType.T | undefined;
};

/** One `WHEN` of the conversion: a value to match, and what it becomes. */
export type ColumnConversionCase = {
  /** The value as written in the list, normalized by SQL when compared */
  match: string;

  /** The value it becomes, or null to leave it empty */
  output: string | null;
};

/** The SQL type a conversion casts its output to. */
export type ColumnConversionOutputType =
  | { kind: "bigint" }
  | { kind: "varchar" }
  | { kind: "enum"; labels: readonly string[] };

/**
 * The rows `ColumnConversion.fromRows` reads: a dataset's bindings, the
 * code lists they use, and every one of its columns, keep-original copies
 * included.
 */
export type ColumnConversionRows = {
  bindings: ReadonlyArray<
    Pick<
      DictionaryBinding.T,
      | "id"
      | "datasetColumnId"
      | "codeListId"
      | "mode"
      | "direction"
      | "keepsOriginal"
      | "valueOverrides"
      | "pinnedPairs"
      | "pinnedIsOrdered"
      | "replacedDataType"
    >
  >;
  codeLists: ReadonlyArray<
    Pick<DataDictionaryCodeList.T, "id" | "isOrdered" | "pairs">
  >;
  columns: ReadonlyArray<
    Pick<DatasetColumn.T, "id" | "name" | "dataType" | "dictionaryBindingId">
  >;
};
