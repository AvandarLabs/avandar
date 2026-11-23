/* oxlint-disable typescript/no-namespace */
import type {
  DataDictionaryEntryId,
  DataDictionaryEntryKind,
  DataDictionaryEntryModel,
} from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";

export { DataDictionaryEntryParsers } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntryParsers.ts";

/** Public namespace for dictionary entries. */
export namespace DataDictionaryEntry {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof DataDictionaryEntryModel = "Read"> =
    DataDictionaryEntryModel[K];

  /** Identifies an entry. */
  export type Id = DataDictionaryEntryId;

  /** What kind of column an entry describes. */
  export type Kind = DataDictionaryEntryKind;
}
