import type { DataDictionaryId } from "$/models/dataDictionaries/DataDictionary/DataDictionary.types.ts";
import type {
  CodePair,
  DataDictionaryCodeListId,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.types.ts";
import type { DataDictionaryEntryId } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.types.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
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

/**
 * How one value no pair matches is resolved in a converted column. `keep`
 * leaves it as it is, `empty` turns it into an empty value, and `map`
 * converts it as if it were the pair whose code is `code`.
 */
export type DictionaryBindingValueOverride =
  | { value: string; action: "keep" }
  | { value: string; action: "empty" }
  | { value: string; action: "map"; code: string };

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

    /** Whether a `<column>_original` copy keeps the values as stored */
    keepsOriginal: boolean;

    /** Whether the column's values are converted or only explained */
    mode: DictionaryBindingMode;

    /** Whether the pinned pairs are levels of a scale. Set with them. */
    pinnedIsOrdered: boolean | undefined;

    /**
     * The pairs this column converts with, frozen when it was converted in
     * place or when its dictionary, entry, or code list was deleted.
     * Undefined while the binding follows its live code list.
     */
    pinnedPairs: CodePair[] | undefined;

    /**
     * The column's data type before this binding converted it, restored
     * when it stops converting. Undefined for a reference binding.
     */
    replacedDataType: AvaDataType.T | undefined;

    /** Timestamp of when the binding was last updated */
    updatedAt: string;

    /** How each value no pair matches is resolved. Empty unless converting. */
    valueOverrides: DictionaryBindingValueOverride[];

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
  /** Convert only: keep a `<column>_original` copy of the stored values. */
  keepsOriginal: boolean;
  /** Convert only: how each value no pair matches is resolved. */
  valueOverrides: readonly DictionaryBindingValueOverride[];
  /** Convert only: freeze today's pairs, for a dataset converted in place. */
  isPinned: boolean;
};

/** A value the user adds to a code list while applying. */
export type DictionaryBindingAddedPair = {
  codeListId: DataDictionaryCodeListId;
  code: string;
  label: string;
};

/**
 * A stable reason one of the apply RPCs refuses, sent as the error's
 * `hint`.
 */
export type DictionaryBindingApplyErrorHint =
  | "dataset_editor_required"
  | "dictionary_viewer_required"
  | "binding_payload_invalid"
  | "binding_mode_unsupported"
  | "column_not_in_dataset"
  | "entry_not_in_dictionary"
  | "code_list_not_in_entry"
  | "convert_needs_code_list"
  | "dataset_has_linked_datasets"
  | "dictionary_editor_required"
  | "code_pair_incomplete"
  | "codes_not_unique"
  | "labels_not_unique"
  | "dataset_creator_required"
  | "nothing_to_reapply";

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
        | "keepsOriginal"
        | "mode"
        | "pinnedIsOrdered"
        | "pinnedPairs"
        | "replacedDataType"
        | "updatedAt"
        | "valueOverrides"
      >;
      Update: Partial<DictionaryBindingRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
