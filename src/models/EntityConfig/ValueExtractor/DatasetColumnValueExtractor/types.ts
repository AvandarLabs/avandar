import { SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetColumnId } from "@/models/datasets/DatasetColumn";
import { WorkspaceId } from "@/models/Workspace/types";
import type { EntityFieldConfigId } from "../../EntityFieldConfig/EntityFieldConfig.types";
import type { UUID } from "@/lib/types/common";

export type DatasetColumnValueExtractorId = UUID<"DatasetColumnValueExtractor">;

export type ValuePickerRuleType = "most_frequent" | "first";

type DatasetColumnValueExtractorRead = {
  /** Unique identifier for this extractor config */
  id: DatasetColumnValueExtractorId;

  /** ID of the associated workspace */
  workspaceId: WorkspaceId;

  /** Type of extractor */
  type: "dataset_column_value";

  /** ID of the associated entity field config */
  entityFieldConfigId: EntityFieldConfigId;

  /** Rule to pick which value to use when multiple are found */
  valuePickerRuleType: ValuePickerRuleType;

  /** ID of the dataset to extract from */
  datasetId: DatasetId;

  /**
   * ID of the specific field in the dataset to extract from
   *
   * TODO(jpsyx): this should be renamed to `datasetColumnId`
   */
  datasetFieldId: DatasetColumnId;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

type DatasetColumnValueExtractorInsert = SetOptional<
  DatasetColumnValueExtractorRead,
  "id" | "createdAt" | "updatedAt"
>;

type DatasetColumnValueExtractorUpdate = Partial<
  DatasetColumnValueExtractorRead
>;

/**
 * CRUD type definitions for the DatasetColumnValueExtractor model.
 */
export type DatasetColumnValueExtractorModel = SupabaseModelCRUDTypes<
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
