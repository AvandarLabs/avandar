import { SetRequired, Simplify } from "type-fest";
import type { EntityFieldConfigId } from "../../EntityFieldConfig/EntityFieldConfig.types";
import type { JSONType, UUID } from "@/lib/types/common";
import type { DefineModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";
import type { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import type { DatasetFieldId } from "@/models/DatasetField";

export type AggregationExtractorConfigId = UUID<"AggregationExtractorConfig">;
export type AggregationType = "sum" | "max" | "count";

/**
 * CRUD type definition for the aggregation extractor config model
 */
type AggregationExtractorConfigRead = {
  /** Unique identifier for this extractor config */
  id: AggregationExtractorConfigId;

  /** ID of the associated entity field config */
  entityFieldConfigId: EntityFieldConfigId;

  /** Type of aggregation to perform */
  aggregationType: AggregationType;

  /** ID of the dataset to extract from */
  datasetId: UUID<"Dataset">;

  /** ID of the specific field in the dataset to aggregate */
  datasetFieldId: DatasetFieldId;

  /** Filter to apply before aggregation */
  filter: JSONType | null;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

export type AggregationExtractorConfigCRUDTypes = DefineModelCRUDTypes<
  SupabaseModelCRUDTypes<"value_extractor_config__aggregation">,
  {
    modelName: "AggregationExtractorConfig";
    modelPrimaryKey: "id";
    dbTablePrimaryKey: "id";
    Read: AggregationExtractorConfigRead;
    Insert: SetRequired<
      Partial<AggregationExtractorConfigRead>,
      "aggregationType" | "datasetFieldId" | "datasetId" | "entityFieldConfigId"
    >;
    Update: Partial<AggregationExtractorConfigRead>;
  }
>;

export type AggregationExtractorConfig<
  K extends keyof AggregationExtractorConfigCRUDTypes = "Read",
> = Simplify<AggregationExtractorConfigCRUDTypes[K]>;
