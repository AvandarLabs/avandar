/* oxlint-disable typescript/no-namespace, import/export */
import type {
  DataDictionaryCodeListDraft,
  DataDictionaryDraft,
  DataDictionaryDraftIssue,
  DataDictionaryDraftWarning,
  DataDictionaryEntryCodingDraft,
  DataDictionaryEntryDraft,
  DataDictionaryId,
  DataDictionaryModel,
  DataDictionarySaveErrorHint,
  DataDictionarySavePayload,
} from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";

export { DataDictionaryParsers } from "$/models/dataDictionaries/DataDictionary/DataDictionaryParsers.ts";
export { DataDictionaryModule as DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionaryModule/DataDictionaryModule.ts";

/** Public namespace for data dictionaries and their editable drafts. */
export namespace DataDictionary {
  export type T<K extends keyof DataDictionaryModel = "Read"> =
    DataDictionaryModel[K];
  export type Id = DataDictionaryId;
  export type Draft = DataDictionaryDraft;
  export type EntryDraft = DataDictionaryEntryDraft;
  export type CodeListDraft = DataDictionaryCodeListDraft;
  export type CodingDraft = DataDictionaryEntryCodingDraft;
  export type DraftIssue = DataDictionaryDraftIssue;
  export type DraftWarning = DataDictionaryDraftWarning;
  export type SavePayload = DataDictionarySavePayload;
  export type SaveErrorHint = DataDictionarySaveErrorHint;
}
