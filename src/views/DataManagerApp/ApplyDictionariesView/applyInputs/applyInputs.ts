import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import {
  toValueKey,
  trimSpaces,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
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

/** Whether `codeList` has a pair with `code`, as the apply RPC checks. */
function _hasCode(
  codeList: DataDictionaryCodeList.T | undefined,
  code: string,
): boolean {
  return (codeList?.pairs ?? []).some((pair) => {
    return ColumnConversion.isSameCode(pair.code, code);
  });
}

/**
 * Every resolution but Add to list, which adds a pair instead. A map to a
 * code `codeList` does not have keeps the value as is.
 */
function _toOverrides(
  resolutions: Resolutions,
  unmatched: readonly UnmatchedValue[] | undefined,
  codeList: DataDictionaryCodeList.T | undefined,
): DictionaryBinding.ValueOverride[] {
  return _resolvedValues(resolutions, unmatched).flatMap(
    ({ value, resolution }): DictionaryBinding.ValueOverride[] => {
      switch (resolution.action) {
        case "map":
          // A map with no label chosen yet keeps the value as is.
          return resolution.code === "" || !_hasCode(codeList, resolution.code)
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
 * pinned when `isPinned`; everything else is attached plain. A map to a
 * code its list in `codeLists` does not have is left out.
 */
export function buildBindingInputs(
  options: Readonly<{
    columns: readonly DatasetColumn.T[];
    picks: Readonly<Record<string, ColumnPick>>;
    resolutions: ResolutionsByColumnId;
    unmatchedByColumnId: UnmatchedByColumnId;
    codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
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
              options.codeLists.get(pick.codeListId),
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
    ? {
        codeListId: pick.codeListId,
        code: trimSpaces(value),
        label: trimSpaces(text),
      }
    : {
        codeListId: pick.codeListId,
        code: trimSpaces(text),
        label: trimSpaces(value),
      };
}

type AddOptions = Readonly<{
  picks: Readonly<Record<string, ColumnPick>>;
  resolutions: ResolutionsByColumnId;
  unmatchedByColumnId: UnmatchedByColumnId;
}>;

/** Every Add to list resolution with its column, value key, and pair. */
function _collectAdds(options: AddOptions): Array<{
  columnId: string;
  valueKey: string;
  pair: DictionaryBinding.AddedPair;
}> {
  return Object.entries(options.picks).flatMap(([columnId, pick]) => {
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
        ? [
            {
              columnId,
              valueKey: toValueKey(value),
              pair: _toAddedPair(withList, value, resolution.text),
            },
          ]
        : [];
    });
  });
}

function _toAddedCodeKey(pair: DictionaryBinding.AddedPair): string {
  return `${pair.codeListId}:${pair.code.toLowerCase()}`;
}

/**
 * The pairs Add to list puts in code lists, once each per list and code,
 * ignoring an entry left blank.
 */
export function buildAddedPairs(
  options: AddOptions,
): DictionaryBinding.AddedPair[] {
  const seen = new Set<string>();
  return _collectAdds(options)
    .map((add) => {
      return add.pair;
    })
    .filter((pair) => {
      const key = _toAddedCodeKey(pair);
      const isNew = !seen.has(key);
      seen.add(key);
      return isNew;
    });
}

/**
 * One Add to list resolution whose code another adds to the same list with
 * a different label, which a list cannot hold.
 */
export type AddedCodeConflict = {
  columnId: string;
  valueKey: string;
  codeListId: DataDictionaryCodeList.Id;
  /** The code as this resolution adds it. */
  code: string;
};

/**
 * Every Add to list resolution that adds a code to a list another one adds
 * with a different label, in column then value order. Saving is blocked
 * until none are left; two adding the very same pair are not a conflict.
 */
export function findAddedCodeConflicts(
  options: AddOptions,
): AddedCodeConflict[] {
  const adds = _collectAdds(options);
  const labelsByCode = new Map<string, Set<string>>();
  adds.forEach(({ pair }) => {
    const key = _toAddedCodeKey(pair);
    labelsByCode.set(key, (labelsByCode.get(key) ?? new Set()).add(pair.label));
  });
  return adds.flatMap(({ columnId, valueKey, pair }) => {
    return (labelsByCode.get(_toAddedCodeKey(pair))?.size ?? 0) > 1
      ? [{ columnId, valueKey, codeListId: pair.codeListId, code: pair.code }]
      : [];
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
    overrides: _toOverrides(
      options.resolutions,
      options.unmatched,
      options.codeList,
    ),
    outputDataType: ColumnConversion.getOutputDataType({
      direction: options.pick.direction,
      pairs,
    }),
  };
}
