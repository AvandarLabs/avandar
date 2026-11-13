import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

/** One value of a column's code list: the code, what it means, and more. */
export type ColumnCodePair = {
  code: string;
  /** Blank while nobody has said what the code means. */
  label: string;
  acceptedSpellings: readonly string[];
  isMissing: boolean;
};

/**
 * What a model is told about one bound column: which side of the pairs the
 * column holds, the pairs, and the entry's description. Plain JSON, so it
 * can sit in a cached dataset schema.
 */
export type ColumnCodesContext = {
  direction: DictionaryBinding.Direction;
  /** Empty for an entry with no code list, which only describes. */
  pairs: readonly ColumnCodePair[];
  description?: string;
};

/**
 * Everything Avandar shows about one bound column: the context a model
 * gets, plus where it came from for the code-list popover and the rail.
 */
export type ColumnCodesT = ColumnCodesContext & {
  datasetColumnId: string;
  dictionaryId: string;
  dictionaryName: string;
  entryName: string;
  codeListName: string | undefined;
  isOrdered: boolean;
  mode: DictionaryBinding.Mode;
};

/**
 * The rows `ColumnCodes.fromRows` joins, in a shape both the browser's
 * models and an edge function's raw rows can fill.
 */
export type ColumnCodesRows = {
  bindings: ReadonlyArray<{
    datasetColumnId: string;
    dictionaryId: string | undefined;
    entryId: string | undefined;
    codeListId: string | undefined;
    mode: DictionaryBinding.Mode;
    direction: DictionaryBinding.Direction;
  }>;
  dictionaries: ReadonlyArray<{ id: string; name: string }>;
  entries: ReadonlyArray<{
    id: string;
    name: string;
    description: string | undefined;
  }>;
  codeLists: ReadonlyArray<{
    id: string;
    name: string;
    isOrdered: boolean;
    pairs: readonly ColumnCodePair[];
  }>;
};
