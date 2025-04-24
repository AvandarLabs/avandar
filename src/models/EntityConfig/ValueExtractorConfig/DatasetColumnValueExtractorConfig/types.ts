import { SetOptional, Simplify } from "type-fest";
import type { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import type { UUID } from "@/lib/types/common";
import type { DefineModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";
import type { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import type { DatasetFieldId } from "@/models/DatasetField";

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
  datasetId: UUID<"Dataset">;

  /** ID of the specific field in the dataset to extract from */
  datasetFieldId: DatasetFieldId;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

/**
 * CRUD type definitions for the DatasetColumnValueExtractorConfig model.
 */
export type DatasetColumnValueExtractorConfigCRUDTypes = DefineModelCRUDTypes<
  SupabaseModelCRUDTypes<"value_extractor_config__dataset_column_value">,
  {
    modelName: "DatasetColumnValueExtractorConfig";
    modelPrimaryKey: "id";
    dbTablePrimaryKey: "id";
    Read: DatasetColumnValueExtractorConfigRead;
    Insert: SetOptional<
      Required<DatasetColumnValueExtractorConfigRead>,
      "id" | "createdAt" | "updatedAt"
    >;
    Update: Partial<DatasetColumnValueExtractorConfigRead>;
  }
>;

export type DatasetColumnValueExtractorConfig<
  K extends keyof DatasetColumnValueExtractorConfigCRUDTypes = "Read",
> = Simplify<DatasetColumnValueExtractorConfigCRUDTypes[K]>;
