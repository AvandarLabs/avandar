import { SetOptional, Simplify } from "type-fest";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import type { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import type { UUID } from "@/lib/types/common";
import type { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import type { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";

export type DatasetColumnValueExtractorConfigId =
  UUID<"DatasetColumnValueExtractorConfig">;

export type ValuePickerRuleType = "most_frequent" | "first";

type DatasetColumnValueExtractorConfigRead = {
  /** Unique identifier for this extractor config */
  id: DatasetColumnValueExtractorConfigId;

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
 * CRUD type definitions for the DatasetColumnValueExtractorConfig model.
 */
export type DatasetColumnValueExtractorConfigCRUDTypes = SupabaseModelCRUDTypes<
  {
    tableName: "value_extractor_config__dataset_column_value";
    modelName: "DatasetColumnValueExtractorConfig";
    modelPrimaryKeyType: DatasetColumnValueExtractorConfigId;
  },
  {
    Read: DatasetColumnValueExtractorConfigRead;
    Insert: SetOptional<
      Required<DatasetColumnValueExtractorConfigRead>,
      "id" | "createdAt" | "updatedAt"
    >;
    Update: Partial<DatasetColumnValueExtractorConfigRead>;
  },
  {
    modelPrimaryKey: "id";
    dbTablePrimaryKey: "id";
  }
>;

export type DatasetColumnValueExtractorConfig<
  K extends keyof DatasetColumnValueExtractorConfigCRUDTypes = "Read",
> = Simplify<DatasetColumnValueExtractorConfigCRUDTypes[K]>;
