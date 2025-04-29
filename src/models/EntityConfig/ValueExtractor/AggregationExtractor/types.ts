import { SetOptional, Simplify } from "type-fest";
import { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import type { JSONValue, UUID } from "@/lib/types/common";
import type { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import type { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";

export type AggregationExtractorId = UUID<"AggregationExtractor">;
export type AggregationType = "sum" | "max" | "count";

/**
 * CRUD type definition for the aggregation extractor config model
 */
type AggregationExtractorRead = {
  /** Unique identifier for this extractor config */
  id: AggregationExtractorId;

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

type AggregationExtractorInsert = SetOptional<
  Required<AggregationExtractorRead>,
  "id" | "createdAt" | "updatedAt" | "filter"
>;

type AggregationExtractorUpdate = Partial<AggregationExtractorRead>;

export type AggregationExtractorCRUDTypes = SupabaseModelCRUDTypes<
  {
    tableName: "value_extractor__aggregation";
    modelName: "AggregationExtractor";
    modelPrimaryKeyType: AggregationExtractorId;
  },
  {
    Read: AggregationExtractorRead;
    Insert: AggregationExtractorInsert;
    Update: AggregationExtractorUpdate;
  },
  {
    dbTablePrimaryKey: "id";
    modelPrimaryKey: "id";
  }
>;

export type AggregationExtractor<
  K extends keyof AggregationExtractorCRUDTypes = "Read",
> = Simplify<AggregationExtractorCRUDTypes[K]>;
