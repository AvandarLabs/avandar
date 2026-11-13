/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DictionaryMatchEntry,
  DictionaryMatchFit,
  DictionaryMatchT,
} from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch.types.ts";

export { DictionaryMatchModule as DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatchModule/DictionaryMatchModule.ts";

/** Public namespace for matching dataset columns to dictionary entries. */
export namespace DictionaryMatch {
  export type T = DictionaryMatchT;
  export type Entry = DictionaryMatchEntry;
  export type Fit = DictionaryMatchFit;
}
