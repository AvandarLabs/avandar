import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

/**
 * How an entry's values relate to a column's. `fits`: half or more of the
 * column's rows hold a code or label from the entry's code list.
 * `values_dont_fit`: the entry has codes but the column's values are not
 * them. `description`: only the entry's description applies, because the
 * entry has no codes or the column's values could not be compared with them
 * (too many to list, or none at all).
 */
export type DictionaryMatchFit = "fits" | "values_dont_fit" | "description";

/**
 * A dictionary entry ready to be matched against columns: its names, kind,
 * and the code lists it recognizes, primary first. `dictionaryRank` is the
 * dictionary's place in the user's list, which breaks ties.
 */
export type DictionaryMatchEntry = {
  dictionaryId: DataDictionary.Id;
  dictionaryRank: number;
  entryId: DataDictionaryEntry.Id;
  entryName: string;
  columnNames: readonly string[];
  kind: DataDictionaryEntry.Kind;
  position: number;
  codeLists: ReadonlyArray<{
    id: DataDictionaryCodeList.Id;
    name: string;
    pairs: readonly DataDictionaryCodeList.Pair[];
  }>;
};

/** How well one dictionary entry matches one dataset column. */
export type DictionaryMatchT = {
  dictionaryId: DataDictionary.Id;
  dictionaryRank: number;
  entryId: DataDictionaryEntry.Id;
  entryName: string;
  position: number;
  /**
   * The entry's code list that fits the column best. Undefined for a
   * description.
   */
  codeListId: DataDictionaryCodeList.Id | undefined;
  codeListName: string | undefined;
  /**
   * The share of the column's rows the code list covers, from 0 to 1.
   * Undefined for a description.
   */
  coverage: number | undefined;
  /** Whether the column holds the list's codes or its labels. */
  direction: DictionaryBinding.Direction;
  fit: DictionaryMatchFit;
  /**
   * Name 0.45, values 0.35, type 0.2, rescaled when values are unknown. An
   * entry with codes that could not be compared scores below every match
   * that was.
   */
  score: number;
};
