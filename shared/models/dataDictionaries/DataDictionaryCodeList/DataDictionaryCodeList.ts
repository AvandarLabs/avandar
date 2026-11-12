/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CodePair,
  DataDictionaryCodeListId,
  DataDictionaryCodeListModel,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";

export {
  codePairsToDBJson,
  DataDictionaryCodeListParsers,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeListParsers.ts";

/** Public namespace for dictionary code lists. */
export namespace DataDictionaryCodeList {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof DataDictionaryCodeListModel = "Read"> =
    DataDictionaryCodeListModel[K];

  /** Identifies a code list. */
  export type Id = DataDictionaryCodeListId;

  /** One two-way value in a code list. */
  export type Pair = CodePair;
}
