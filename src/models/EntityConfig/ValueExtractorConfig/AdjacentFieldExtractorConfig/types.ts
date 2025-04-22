import { SetOptional, Simplify } from "type-fest";
import type { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import type { UUID } from "@/lib/types/common";
import type { DefineModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";
import type { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import type { DatasetFieldId } from "@/models/DatasetField";

export type AdjacentFieldExtractorConfigId =
  UUID<"AdjacentFieldExtractorConfig">;

export type ValuePickerRuleType = "most_frequent" | "first";

type AdjacentFieldExtractorConfigRead = {
  /** Unique identifier for this extractor config */
  id: AdjacentFieldExtractorConfigId;

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
 * CRUD type definitions for the AdjacentFieldExtractorConfig model.
 */
export type AdjacentFieldExtractorConfigCRUDTypes = DefineModelCRUDTypes<
  SupabaseModelCRUDTypes<"value_extractor_config__adjacent_field">,
  {
    modelName: "AdjacentFieldExtractorConfig";
    modelPrimaryKey: "id";
    dbTablePrimaryKey: "id";
    Read: AdjacentFieldExtractorConfigRead;
    Insert: SetOptional<
      Required<AdjacentFieldExtractorConfigRead>,
      "id" | "createdAt" | "updatedAt"
    >;
    Update: Partial<AdjacentFieldExtractorConfigRead>;
  }
>;

export type AdjacentFieldExtractorConfig<
  K extends keyof AdjacentFieldExtractorConfigCRUDTypes = "Read",
> = Simplify<AdjacentFieldExtractorConfigCRUDTypes[K]>;
