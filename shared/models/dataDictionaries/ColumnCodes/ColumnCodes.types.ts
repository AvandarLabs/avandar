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
 * gets, plus where it came from for the code-list popover and the rail. For
 * a converted column, `direction` is the side it holds once converted.
 */
export type ColumnCodesT = ColumnCodesContext & {
  datasetColumnId: string;
  /** Blank when the dictionary is deleted or the reader cannot open it. */
  dictionaryId: string;
  /** Blank when the dictionary is deleted or the reader cannot open it. */
  dictionaryName: string;
  /** Blank when the entry is deleted or the reader cannot open it. */
  entryName: string;
  codeListName: string | undefined;
  isOrdered: boolean;
  mode: DictionaryBinding.Mode;
  /** Whether a `<column>_original` copy is kept beside the converted column. */
  keepsOriginal: boolean;
  /** Whether the pairs are pinned rather than the live list's. */
  isPinned: boolean;
  /** The dictionary's version when the binding was written. */
  appliedDictionaryVersion: number;
  /** The dictionary's version now, or undefined when it is unavailable. */
  currentDictionaryVersion: number | undefined;
  /**
   * Whether the dictionary or entry is deleted or unreadable. Only a pinned
   * binding is kept then: it still converts with its pinned pairs.
   */
  isSourceDeleted: boolean;
};

/**
 * The rows `ColumnCodes.fromRows` joins, in a shape both the browser's
 * models and an edge function's raw rows can fill.
 */
export type ColumnCodesRows = {
  bindings: ReadonlyArray<{
    id: string;
    datasetColumnId: string;
    dictionaryId: string | undefined;
    entryId: string | undefined;
    codeListId: string | undefined;
    mode: DictionaryBinding.Mode;
    direction: DictionaryBinding.Direction;
    keepsOriginal: boolean;
    /** Set for a pinned binding: the pairs it converts with. */
    pinnedPairs: readonly ColumnCodePair[] | undefined;
    pinnedIsOrdered: boolean | undefined;
    appliedDictionaryVersion: number;
  }>;
  dictionaries: ReadonlyArray<{ id: string; name: string; version: number }>;
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
