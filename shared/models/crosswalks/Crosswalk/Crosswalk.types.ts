import type { CrosswalkColumnId } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.types.ts";
import type {
  CrosswalkLayoutId,
  CrosswalkLayoutStatus,
} from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.types.ts";
import type {
  CrosswalkFill,
  CrosswalkMappingId,
  CrosswalkMappingReason,
  CrosswalkMappingStatus,
} from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.types.ts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "Crosswalk";
export type CrosswalkId = UUID<ModelType>;

/**
 * How a combined dataset writes a coded column: the code list's `labels`,
 * such as Male, or its `codes`, such as 1.
 */
export type CrosswalkCodesOutput = Enums<"crosswalks__codes_output">;

/**
 * A code list the combined dataset embedded, and the fingerprint of its
 * pairs then. The stale banner compares it with the list's pairs now.
 */
export type CrosswalkCompiledCodeList = {
  codeListId: DataDictionaryCodeList.Id;
  fingerprint: string;
};

/**
 * A crosswalk: how many datasets with different column layouts map onto
 * one set of columns, and the combined dataset that stacks them.
 */
type CrosswalkRead = Model.Base<
  ModelType,
  {
    /** Whether the combined dataset gets a `source_dataset` column */
    addsSourceColumn: boolean;

    /** How the combined dataset writes coded columns */
    codesOutputAs: CrosswalkCodesOutput;

    /** When the combined dataset's SQL was last saved */
    compiledAt: string | undefined;

    /** The code lists the combined dataset's SQL embedded, with fingerprints */
    compiledCodeLists: CrosswalkCompiledCodeList[] | undefined;

    /** Timestamp of when the crosswalk was created */
    createdAt: string;

    /** Description of the crosswalk */
    description: string | undefined;

    /** Unique identifier of the crosswalk */
    id: CrosswalkId;

    /** Name of the crosswalk */
    name: string;

    /** The combined dataset. Undefined until it is created or once deleted. */
    outputDatasetId: Dataset.Id | undefined;

    /** User id of the owner */
    ownerId: User.Id;

    /** The owner's profile in this workspace */
    ownerProfileId: UserProfile.Id;

    /** Timestamp of when the crosswalk was last updated */
    updatedAt: string;

    /** Workspace this crosswalk belongs to */
    workspaceId: Workspace.Id;
  }
>;

/** Everything `rpc_crosswalks__save` replaces, in model shape. */
export type CrosswalkSavePayload = {
  crosswalkId: CrosswalkId;
  settings: {
    name: string;
    description: string | undefined;
    codesOutputAs: CrosswalkCodesOutput;
    addsSourceColumn: boolean;
  };
  columns: ReadonlyArray<{
    id: CrosswalkColumnId;
    name: string;
    position: number;
    dataType: AvaDataType.T;
    entryId: DataDictionaryEntry.Id | undefined;
  }>;
  layouts: ReadonlyArray<{
    id: CrosswalkLayoutId;
    signature: string;
    columnNames: readonly string[];
    isReference: boolean;
    status: CrosswalkLayoutStatus;
  }>;
  datasets: ReadonlyArray<{
    datasetId: Dataset.Id;
    layoutId: CrosswalkLayoutId;
  }>;
  mappings: ReadonlyArray<{
    id: CrosswalkMappingId;
    layoutId: CrosswalkLayoutId;
    columnId: CrosswalkColumnId;
    fill: CrosswalkFill;
    status: CrosswalkMappingStatus;
    confidence: number | undefined;
    reason: CrosswalkMappingReason | undefined;
  }>;
};

/** Everything `rpc_crosswalks__save_combined_dataset` writes. */
export type CrosswalkCombinePayload = {
  crosswalkId: CrosswalkId;
  datasetId: Dataset.Id;
  datasetName: string;
  rawSql: string;
  columns: ReadonlyArray<{ name: string; dataType: AvaDataType.T }>;
  bindings: ReadonlyArray<{
    columnName: string;
    dictionaryId: DataDictionary.Id;
    entryId: DataDictionaryEntry.Id;
    codeListId: DataDictionaryCodeList.Id;
    direction: DictionaryBinding.Direction;
  }>;
  compiledCodeLists: readonly CrosswalkCompiledCodeList[];
};

/** The stable `hint` values `rpc_crosswalks__save` raises with. */
export type CrosswalkSaveErrorHint =
  | "crosswalk_editor_required"
  | "crosswalk_payload_invalid"
  | "crosswalk_name_required"
  | "column_name_required"
  | "column_names_not_unique"
  | "reference_layout_required"
  | "layout_signatures_not_unique"
  | "item_not_in_crosswalk"
  | "dataset_not_readable"
  | "entry_not_in_workspace"
  | "mappings_not_unique"
  | "fill_invalid"
  | "output_dataset_in_crosswalk";

/**
 * The stable `hint` values `rpc_crosswalks__save_combined_dataset` raises
 * with.
 */
export type CrosswalkCombineErrorHint =
  | "crosswalk_editor_required"
  | "combined_dataset_name_required"
  | "combined_columns_invalid"
  | "binding_column_missing"
  | "binding_not_in_workspace"
  | "dataset_creator_required"
  | "combined_dataset_mismatch"
  | "dataset_editor_required"
  | "crosswalk_has_unreadable_datasets";

/** CRUD type definitions for the Crosswalk model. */
export type CrosswalkModel = SupabaseCrudModelSpec<
  {
    tableName: "crosswalks";
    modelName: "Crosswalk";
    modelPrimaryKeyType: CrosswalkId;
    modelTypes: {
      Read: CrosswalkRead;
      Insert: SetOptional<
        CrosswalkRead,
        | "addsSourceColumn"
        | "codesOutputAs"
        | "compiledAt"
        | "compiledCodeLists"
        | "createdAt"
        | "description"
        | "id"
        | "outputDatasetId"
        | "ownerId"
        | "updatedAt"
      >;
      Update: Partial<CrosswalkRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
