import type { SupabaseCRUDModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
import type { UUID } from "@utils/types/common.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { EntityFieldConfigId } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { SetOptional, Simplify } from "type-fest";

export type DatasetColumnValueExtractorId = UUID<"DatasetColumnValueExtractor">;

export type ValuePickerRuleType =
  Enums<"value_extractors__value_picker_rule_type">;

type DatasetColumnValueExtractorRead = {
  /** Unique identifier for this extractor config */
  id: DatasetColumnValueExtractorId;

  /** ID of the associated workspace */
  workspaceId: Workspace.Id;

  /** Type of extractor */
  type: "dataset_column_value";

  /** ID of the associated entity field config */
  entityFieldConfigId: EntityFieldConfigId;

  /** Rule to pick which value to use when multiple are found */
  valuePickerRuleType: ValuePickerRuleType;

  /** ID of the dataset to extract from */
  datasetId: DatasetId;

  /** ID of the specific field in the dataset to extract from */
  datasetColumnId: DatasetColumnId;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

type DatasetColumnValueExtractorInsert = SetOptional<
  DatasetColumnValueExtractorRead,
  "id" | "createdAt" | "updatedAt"
>;

type DatasetColumnValueExtractorUpdate =
  Partial<DatasetColumnValueExtractorRead>;

/**
 * CRUD type definitions for the DatasetColumnValueExtractor model.
 */
export type DatasetColumnValueExtractorModel = SupabaseCRUDModelSpec<
  {
    tableName: "value_extractors__dataset_column_value";
    modelName: "DatasetColumnValueExtractor";
    modelPrimaryKeyType: DatasetColumnValueExtractorId;
    modelTypes: {
      Read: DatasetColumnValueExtractorRead;
      Insert: DatasetColumnValueExtractorInsert;
      Update: DatasetColumnValueExtractorUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type DatasetColumnValueExtractor<
  K extends keyof DatasetColumnValueExtractorModel = "Read",
> = Simplify<DatasetColumnValueExtractorModel[K]>;
