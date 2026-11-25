/* oxlint-disable typescript/no-namespace */
import type {
  DataDictionaryEntryCodingId,
  DataDictionaryEntryCodingModel,
} from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.types.ts";

export { DataDictionaryEntryCodingParsers } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCodingParsers.ts";

/** Public namespace for the code lists an entry recognizes. */
export namespace DataDictionaryEntryCoding {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof DataDictionaryEntryCodingModel = "Read"> =
    DataDictionaryEntryCodingModel[K];

  /** Identifies a coding. */
  export type Id = DataDictionaryEntryCodingId;
}
