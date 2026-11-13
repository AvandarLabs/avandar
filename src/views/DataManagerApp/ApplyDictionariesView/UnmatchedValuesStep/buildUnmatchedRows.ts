import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import { toValueKey } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { UnmatchedValue } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";

/** One value to resolve, with its column and how that column is applied. */
export type UnmatchedRow = {
  column: DatasetColumn.T;
  pick: ColumnPick;
  codeList: DataDictionaryCodeList.T;
  item: UnmatchedValue;
  /** The value is a code already in the list, with a blank label. */
  isInListWithoutLabel: boolean;
  /**
   * The column encodes to whole numbers and the value is not one, so the
   * conversion empties it: it cannot be kept as it is.
   */
  cannotStayAsText: boolean;
};

/** A whole number as the conversion's `TRY_CAST` to `BIGINT` reads it. */
const WHOLE_NUMBER = /^ *-?[0-9]{1,18} *$/;

function _cannotStayAsText(
  item: UnmatchedValue,
  pick: ColumnPick,
  codeList: DataDictionaryCodeList.T,
): boolean {
  const outputDataType = ColumnConversion.getOutputDataType({
    direction: pick.direction,
    pairs: codeList.pairs,
  });
  return (
    pick.mode === "convert" &&
    outputDataType === "bigint" &&
    !WHOLE_NUMBER.test(item.value)
  );
}

function _isInListWithoutLabel(
  item: UnmatchedValue,
  pick: ColumnPick,
  codeList: DataDictionaryCodeList.T,
): boolean {
  return (
    pick.direction === "decode" &&
    codeList.pairs.some((pair) => {
      return (
        toValueKey(pair.code) === item.valueKey && pair.label.trim() === ""
      );
    })
  );
}

/**
 * One value per value key: values that differ only in case or surrounding
 * spaces share a resolution, so their rows are summed and the most common
 * spelling is the one shown. Keys keep the order they first appear in.
 */
export function mergeByValueKey(
  items: readonly UnmatchedValue[],
): UnmatchedValue[] {
  const merged = new Map<string, { item: UnmatchedValue; topCount: number }>();
  for (const item of items) {
    const found = merged.get(item.valueKey);
    if (!found) {
      merged.set(item.valueKey, { item: { ...item }, topCount: item.rowCount });
      continue;
    }
    const isMoreCommon = item.rowCount > found.topCount;
    merged.set(item.valueKey, {
      item: {
        value: isMoreCommon ? item.value : found.item.value,
        valueKey: item.valueKey,
        rowCount: found.item.rowCount + item.rowCount,
      },
      topCount: isMoreCommon ? item.rowCount : found.topCount,
    });
  }
  return [...merged.values()].map((entry) => {
    return entry.item;
  });
}

/**
 * The Unmatched values step's rows, in the dataset's column order: values
 * of converted columns, and values of reference columns, which have no
 * label to show.
 */
export function buildUnmatchedRows(
  options: Readonly<{
    columns: readonly DatasetColumn.T[];
    picks: Readonly<Record<string, ColumnPick>>;
    codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
    unmatchedByColumnId: ReadonlyMap<string, readonly UnmatchedValue[]>;
  }>,
): { converted: UnmatchedRow[]; reference: UnmatchedRow[] } {
  const rows = options.columns.flatMap((column) => {
    const pick = options.picks[column.id];
    const codeList = pick?.codeListId
      ? options.codeLists.get(pick.codeListId)
      : undefined;
    if (!pick || !codeList) {
      return [];
    }
    const items = mergeByValueKey(
      options.unmatchedByColumnId.get(column.id) ?? [],
    );
    return items.map((item) => {
      return {
        column,
        pick,
        codeList,
        item,
        isInListWithoutLabel: _isInListWithoutLabel(item, pick, codeList),
        cannotStayAsText: _cannotStayAsText(item, pick, codeList),
      };
    });
  });
  return {
    converted: rows.filter((row) => {
      return row.pick.mode === "convert";
    }),
    reference: rows.filter((row) => {
      return row.pick.mode === "reference";
    }),
  };
}
