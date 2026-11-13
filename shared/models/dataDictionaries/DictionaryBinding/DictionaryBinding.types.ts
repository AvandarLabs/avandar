import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type { DataDictionaryCodeListId } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { DataDictionaryEntryId } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DictionaryBinding";
export type DictionaryBindingId = UUID<ModelType>;

/**
 * What applying a dictionary does to a column. `reference` attaches the
 * entry's description and code list and leaves the values alone. `convert`
 * changes the values when the dataset loads.
 */
export type DictionaryBindingMode = "reference" | "convert";

/**
 * Which side of each code pair the column holds. `decode`: the column holds
 * codes, such as 1 and 2. `encode`: it holds labels, such as Male.
 */
export type DictionaryBindingDirection = "decode" | "encode";

/** One dataset column bound to one dictionary entry. */
type DictionaryBindingRead = Model.Base<
  ModelType,
  {
    /** The dictionary's version when this binding was written */
    appliedDictionaryVersion: number;

    /** The entry's code list chosen for this column, if it has one */
    codeListId: DataDictionaryCodeListId | undefined;

    /** Timestamp of when the binding was created */
    createdAt: string;

    /** The bound column */
    datasetColumnId: DatasetColumn.Id;

    /** The dataset the column belongs to */
    datasetId: Dataset.Id;

    /** The dictionary the entry belongs to. Undefined once it is deleted. */
    dictionaryId: DataDictionaryId | undefined;

    /** Which side of each pair the column holds */
    direction: DictionaryBindingDirection;

    /** The bound entry. Undefined once it is deleted. */
    entryId: DataDictionaryEntryId | undefined;

    /** Unique identifier of the binding */
    id: DictionaryBindingId;

    /** Whether the column's values are converted or only explained */
    mode: DictionaryBindingMode;

    /** Timestamp of when the binding was last updated */
    updatedAt: string;

    /** Workspace this binding belongs to, always its dataset's */
    workspaceId: Workspace.Id;
  }
>;

/**
 * One column's binding as the apply RPC takes it: everything the user
 * chose, nothing the database fills in.
 */
export type DictionaryBindingInput = {
  datasetColumnId: DatasetColumn.Id;
  dictionaryId: DataDictionaryId;
  entryId: DataDictionaryEntryId;
  codeListId: DataDictionaryCodeListId | undefined;
  mode: DictionaryBindingMode;
  direction: DictionaryBindingDirection;
};

/**
 * A stable reason `rpc_dataset_columns__apply_dictionaries` refuses an
 * apply, sent as the error's `hint`.
 */
export type DictionaryBindingApplyErrorHint =
  | "dataset_editor_required"
  | "dictionary_viewer_required"
  | "binding_payload_invalid"
  | "binding_mode_unsupported"
  | "column_not_in_dataset"
  | "entry_not_in_dictionary"
  | "code_list_not_in_entry";

/** CRUD type definitions for the DictionaryBinding model. */
export type DictionaryBindingModel = SupabaseCrudModelSpec<
  {
    tableName: "dataset_columns__dictionary_bindings";
    modelName: "DictionaryBinding";
    modelPrimaryKeyType: DictionaryBindingId;
    modelTypes: {
      Read: DictionaryBindingRead;
      Insert: SetOptional<
        DictionaryBindingRead,
        | "codeListId"
        | "createdAt"
        | "dictionaryId"
        | "direction"
        | "entryId"
        | "id"
        | "mode"
        | "updatedAt"
      >;
      Update: Partial<DictionaryBindingRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
