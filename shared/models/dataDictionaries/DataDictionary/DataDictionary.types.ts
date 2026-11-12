import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DataDictionary";
export type DataDictionaryId = UUID<ModelType>;

/** A reusable record of what columns mean, and how their codes read. */
type DataDictionaryRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dictionary was created */
    createdAt: string;

    /** The datasets this dictionary was learned from */
    createdFromDatasetIds: Dataset.Id[];

    /** Description of the dictionary */
    description: string | undefined;

    /** Unique identifier of the dictionary */
    id: DataDictionaryId;

    /** Name of the dictionary */
    name: string;

    /** User id of the owner */
    ownerId: User.Id;

    /** The owner's profile in this workspace */
    ownerProfileId: UserProfile.Id;

    /** Timestamp of when the dictionary was last updated */
    updatedAt: string;

    /** Bumped on every save of entries and code lists */
    version: number;

    /** Workspace this dictionary belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the DataDictionary model. */
export type DataDictionaryModel = SupabaseCrudModelSpec<
  {
    tableName: "data_dictionaries";
    modelName: "DataDictionary";
    modelPrimaryKeyType: DataDictionaryId;
    modelTypes: {
      Read: DataDictionaryRead;
      Insert: SetOptional<
        DataDictionaryRead,
        | "createdAt"
        | "createdFromDatasetIds"
        | "description"
        | "id"
        | "ownerId"
        | "updatedAt"
        | "version"
      >;
      Update: Partial<DataDictionaryRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

/** How an entry recognizes one code list while it is being edited. */
export type DataDictionaryEntryCodingDraft = {
  codeListId: DataDictionaryCodeList.Id;
  isPrimary: boolean;
};

/**
 * An entry while someone edits a dictionary. Text fields hold `""` instead
 * of `undefined` so inputs stay controlled; its position is its index.
 */
export type DataDictionaryEntryDraft = {
  id: DataDictionaryEntry.Id;
  name: string;
  columnNames: string[];
  kind: DataDictionaryEntry.Kind;
  unit: string;
  validMin: number | undefined;
  validMax: number | undefined;
  description: string;
  codings: DataDictionaryEntryCodingDraft[];
};

/** A code list while someone edits a dictionary. */
export type DataDictionaryCodeListDraft = {
  id: DataDictionaryCodeList.Id;
  name: string;
  isOrdered: boolean;
  pairs: DataDictionaryCodeList.Pair[];
};

/** A dictionary's contents while someone edits them. */
export type DataDictionaryDraft = {
  entries: DataDictionaryEntryDraft[];
  codeLists: DataDictionaryCodeListDraft[];
};

/** One reason a dictionary draft cannot be saved yet. */
export type DataDictionaryDraftIssue =
  | { type: "entry_name_required"; entryId: DataDictionaryEntry.Id }
  | { type: "entry_name_not_unique"; entryId: DataDictionaryEntry.Id }
  | { type: "entry_range_invalid"; entryId: DataDictionaryEntry.Id }
  | { type: "entry_primary_required"; entryId: DataDictionaryEntry.Id }
  | { type: "code_list_name_required"; codeListId: DataDictionaryCodeList.Id }
  | {
      type: "code_pair_incomplete";
      codeListId: DataDictionaryCodeList.Id;
      pairIndex: number;
    }
  | {
      type: "code_not_unique";
      codeListId: DataDictionaryCodeList.Id;
      pairIndex: number;
    }
  | {
      type: "label_not_unique";
      codeListId: DataDictionaryCodeList.Id;
      pairIndex: number;
    };

/** The arguments of `rpc_data_dictionaries__save`, in model shape. */
export type DataDictionarySavePayload = {
  dictionaryId: DataDictionaryId;
  codeLists: Array<{
    id: DataDictionaryCodeList.Id;
    name: string;
    isOrdered: boolean;
    pairs: DataDictionaryCodeList.Pair[];
  }>;
  entries: Array<{
    id: DataDictionaryEntry.Id;
    name: string;
    columnNames: string[];
    kind: DataDictionaryEntry.Kind;
    unit: string | undefined;
    validMin: number | undefined;
    validMax: number | undefined;
    description: string | undefined;
    position: number;
    codings: DataDictionaryEntryCodingDraft[];
  }>;
};

/** The stable `hint` values `rpc_data_dictionaries__save` raises with. */
export type DataDictionarySaveErrorHint =
  | "dictionary_editor_required"
  | "dictionary_payload_invalid"
  | "item_not_in_dictionary"
  | "code_list_name_required"
  | "code_pair_incomplete"
  | "codes_not_unique"
  | "labels_not_unique"
  | "entry_name_required"
  | "entry_names_not_unique"
  | "entry_range_invalid"
  | "coding_kind_mismatch"
  | "coding_list_not_in_dictionary"
  | "coding_primary_required";
