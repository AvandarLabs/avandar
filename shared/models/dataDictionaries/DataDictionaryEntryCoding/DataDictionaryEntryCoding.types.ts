import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { DataDictionaryCodeListId } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { DataDictionaryEntryId } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DataDictionaryEntryCoding";
export type DataDictionaryEntryCodingId = UUID<ModelType>;

/** A code list an entry recognizes. */
type DataDictionaryEntryCodingRead = Model.Base<
  ModelType,
  {
    /** The code list the entry recognizes */
    codeListId: DataDictionaryCodeListId;

    /** Timestamp of when the coding was created */
    createdAt: string;

    /** Dictionary the entry and the code list belong to */
    dictionaryId: DataDictionaryId;

    /** The entry */
    entryId: DataDictionaryEntryId;

    /** Unique identifier of the coding */
    id: DataDictionaryEntryCodingId;

    /** Whether this is the entry's canonical coding */
    isPrimary: boolean;

    /** Timestamp of when the coding was last updated */
    updatedAt: string;

    /** Workspace this coding belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the DataDictionaryEntryCoding model. */
export type DataDictionaryEntryCodingModel = SupabaseCrudModelSpec<
  {
    tableName: "data_dictionaries__entry_codings";
    modelName: "DataDictionaryEntryCoding";
    modelPrimaryKeyType: DataDictionaryEntryCodingId;
    modelTypes: {
      Read: DataDictionaryEntryCodingRead;
      Insert: SetOptional<
        DataDictionaryEntryCodingRead,
        "createdAt" | "id" | "isPrimary" | "updatedAt"
      >;
      Update: Partial<DataDictionaryEntryCodingRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
