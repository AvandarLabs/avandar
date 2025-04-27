import { SetOptional, Simplify } from "type-fest";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import type { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import type { UUID } from "@/lib/types/common";
import type { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import type { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";

export type DatasetColumnValueExtractorId = UUID<"DatasetColumnValueExtractor">;

export type ValuePickerRuleType = "most_frequent" | "first";

type DatasetColumnValueExtractorRead = {
  /** Unique identifier for this extractor config */
  id: DatasetColumnValueExtractorId;

  /** ID of the associated entity field config */
  entityFieldConfigId: EntityFieldConfigId;

  /** Rule to pick which value to use when multiple are found */
  valuePickerRuleType: ValuePickerRuleType;

  /** ID of the dataset to extract from */
  datasetId: LocalDatasetId;

  /** ID of the specific field in the dataset to extract from */
  datasetFieldId: LocalDatasetFieldId;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

/**
 * CRUD type definitions for the DatasetColumnValueExtractor model.
 */
export type DatasetColumnValueExtractorCRUDTypes = SupabaseModelCRUDTypes<
  {
    tableName: "value_extractor__dataset_column_value";
    modelName: "DatasetColumnValueExtractor";
    modelPrimaryKeyType: DatasetColumnValueExtractorId;
  },
  {
    Read: DatasetColumnValueExtractorRead;
    Insert: SetOptional<
      Required<DatasetColumnValueExtractorRead>,
      "id" | "createdAt" | "updatedAt"
    >;
    Update: Partial<DatasetColumnValueExtractorRead>;
  },
  {
    modelPrimaryKey: "id";
    dbTablePrimaryKey: "id";
  }
>;

export type DatasetColumnValueExtractor<
  K extends keyof DatasetColumnValueExtractorCRUDTypes = "Read",
> = Simplify<DatasetColumnValueExtractorCRUDTypes[K]>;
