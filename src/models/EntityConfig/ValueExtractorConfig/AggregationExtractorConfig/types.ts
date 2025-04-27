import { SetOptional, Simplify } from "type-fest";
import { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import type { JSONValue, UUID } from "@/lib/types/common";
import type { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import type { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";

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
  datasetFieldId: LocalDatasetFieldId;

  /** Filter to apply before aggregation */
  filter: JSONValue | null;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

export type AggregationExtractorConfigCRUDTypes = SupabaseModelCRUDTypes<
  {
    tableName: "value_extractor_config__aggregation";
    modelName: "AggregationExtractorConfig";
    modelPrimaryKeyType: AggregationExtractorConfigId;
  },
  {
    Read: AggregationExtractorConfigRead;
    Insert: SetOptional<
      Required<AggregationExtractorConfigRead>,
      "id" | "createdAt" | "updatedAt" | "filter"
    >;
    Update: Partial<AggregationExtractorConfigRead>;
  },
  {
    dbTablePrimaryKey: "id";
    modelPrimaryKey: "id";
  }
>;

export type AggregationExtractorConfig<
  K extends keyof AggregationExtractorConfigCRUDTypes = "Read",
> = Simplify<AggregationExtractorConfigCRUDTypes[K]>;
