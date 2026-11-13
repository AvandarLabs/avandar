import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type {
  ColumnPick,
  ValueResolution,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

/** One value in a column that no pair in its code list matches. */
export type UnmatchedValue = {
  /** The value as stored, as text. */
  value: string;
  /** `toValueKey(value)`, the reducer's key for its resolution. */
  valueKey: string;
  rowCount: number;
};

type Resolutions = Readonly<Record<string, ValueResolution>> | undefined;
type ResolutionsByColumnId = Readonly<Record<string, Resolutions>>;
type UnmatchedByColumnId = ReadonlyMap<string, readonly UnmatchedValue[]>;

/** Whether a pick converts its column: convert mode with a code list. */
export function isConvertingPick(
  pick: Readonly<ColumnPick> | undefined,
): pick is ColumnPick & { codeListId: DataDictionaryCodeList.Id } {
  return pick?.mode === "convert" && pick.codeListId !== undefined;
}

/**
 * The resolutions that still name a value in the data, with the value's
 * stored text. When the values could not be read, every resolution counts.
 */
function _resolvedValues(
  resolutions: Resolutions,
  unmatched: readonly UnmatchedValue[] | undefined,
): Array<{ value: string; resolution: ValueResolution }> {
  return Object.entries(resolutions ?? {}).flatMap(([valueKey, resolution]) => {
    const found = unmatched?.find((item) => {
      return item.valueKey === valueKey;
    });
    if (unmatched && !found) {
      return [];
    }
    return [{ value: found?.value ?? valueKey, resolution }];
  });
}

/** Every resolution but Add to list, which adds a pair instead. */
function _toOverrides(
  resolutions: Resolutions,
  unmatched: readonly UnmatchedValue[] | undefined,
): DictionaryBinding.ValueOverride[] {
  return _resolvedValues(resolutions, unmatched).flatMap(
    ({ value, resolution }): DictionaryBinding.ValueOverride[] => {
      switch (resolution.action) {
        case "map":
          // A map with no label chosen yet keeps the value as is.
          return resolution.code === ""
            ? []
            : [{ value, action: "map", code: resolution.code }];
        case "keep":
        case "empty":
          return [{ value, action: resolution.action }];
        case "add":
          return [];
      }
    },
  );
}

/**
 * The bindings the apply RPC takes, in the dataset's column order. A
 * converted column carries its overrides and keep-original choice and is
 * pinned when `isPinned`; everything else is attached plain.
 */
export function buildBindingInputs(
  options: Readonly<{
    columns: readonly DatasetColumn.T[];
    picks: Readonly<Record<string, ColumnPick>>;
    resolutions: ResolutionsByColumnId;
    unmatchedByColumnId: UnmatchedByColumnId;
    isPinned: boolean;
  }>,
): DictionaryBinding.Input[] {
  return options.columns.flatMap((column) => {
    const pick = options.picks[column.id];
    if (!pick) {
      return [];
    }
    const isConverting = isConvertingPick(pick);
    return [
      {
        datasetColumnId: column.id,
        dictionaryId: pick.dictionaryId,
        entryId: pick.entryId,
        codeListId: pick.codeListId,
        mode: isConverting ? "convert" : "reference",
        direction: pick.direction,
        keepsOriginal: isConverting && pick.keepsOriginal,
        valueOverrides: isConverting
          ? _toOverrides(
              options.resolutions[column.id],
              options.unmatchedByColumnId.get(column.id),
            )
          : [],
        isPinned: isConverting && options.isPinned,
      },
    ];
  });
}

function _toAddedPair(
  pick: ColumnPick & { codeListId: DataDictionaryCodeList.Id },
  value: string,
  text: string,
): DictionaryBinding.AddedPair {
  // Data holding codes gains a label; data holding labels gains a code.
  return pick.direction === "decode"
    ? { codeListId: pick.codeListId, code: value.trim(), label: text.trim() }
    : { codeListId: pick.codeListId, code: text.trim(), label: value.trim() };
}

/**
 * The pairs Add to list puts in code lists, once each per list and code,
 * ignoring an entry left blank.
 */
export function buildAddedPairs(
  options: Readonly<{
    picks: Readonly<Record<string, ColumnPick>>;
    resolutions: ResolutionsByColumnId;
    unmatchedByColumnId: UnmatchedByColumnId;
  }>,
): DictionaryBinding.AddedPair[] {
  const added = Object.entries(options.picks).flatMap(([columnId, pick]) => {
    if (!pick.codeListId) {
      return [];
    }
    const withList = { ...pick, codeListId: pick.codeListId };
    const resolved = _resolvedValues(
      options.resolutions[columnId],
      options.unmatchedByColumnId.get(columnId),
    );
    return resolved.flatMap(({ value, resolution }) => {
      return resolution.action === "add" && resolution.text.trim() !== ""
        ? [_toAddedPair(withList, value, resolution.text)]
        : [];
    });
  });
  const seen = new Set<string>();
  return added.filter((pair) => {
    const key = `${pair.codeListId}:${pair.code.toLowerCase()}`;
    const isNew = !seen.has(key);
    seen.add(key);
    return isNew;
  });
}

/**
 * The conversion a column's code list alone gives, with no overrides: what
 * the unmatched-value queries compare the data against.
 */
export function buildMatchConversion(
  options: Readonly<{
    column: DatasetColumn.T;
    pick: ColumnPick;
    codeList: DataDictionaryCodeList.T;
  }>,
): ColumnConversion.T {
  const { pick, codeList } = options;
  return {
    datasetColumnId: options.column.id,
    direction: pick.direction,
    pairs: codeList.pairs,
    isOrdered: codeList.isOrdered,
    overrides: [],
    keepsOriginalAs: undefined,
    // The raw-values view these queries read is already cast.
    inputDataType: undefined,
    outputDataType: ColumnConversion.getOutputDataType({
      direction: pick.direction,
      pairs: codeList.pairs,
    }),
  };
}

/**
 * The conversion a column would get if saved now: its list plus the pairs
 * Add to list adds, and its overrides. The preview runs it.
 */
export function buildDraftConversion(
  options: Readonly<{
    column: DatasetColumn.T;
    pick: ColumnPick & { codeListId: DataDictionaryCodeList.Id };
    codeList: DataDictionaryCodeList.T;
    resolutions: Resolutions;
    unmatched: readonly UnmatchedValue[] | undefined;
  }>,
): ColumnConversion.T {
  const added = _resolvedValues(options.resolutions, options.unmatched).flatMap(
    ({ value, resolution }) => {
      if (resolution.action !== "add" || resolution.text.trim() === "") {
        return [];
      }
      const { code, label } = _toAddedPair(
        options.pick,
        value,
        resolution.text,
      );
      return [{ code, label, acceptedSpellings: [], isMissing: false }];
    },
  );
  const pairs = [...options.codeList.pairs, ...added];
  return {
    ...buildMatchConversion(options),
    pairs,
    overrides: _toOverrides(options.resolutions, options.unmatched),
    outputDataType: ColumnConversion.getOutputDataType({
      direction: options.pick.direction,
      pairs,
    }),
  };
}
