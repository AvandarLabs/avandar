import { SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import type { JSONValue, UUID } from "@/lib/types/common";
import type { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";

export type AggregationExtractorId = UUID<"AggregationExtractor">;
export type AggregationType = "sum" | "max" | "count";

/**
 * CRUD type definition for the aggregation extractor config model
 */
type AggregationExtractorRead = {
  /** Unique identifier for this extractor config */
  id: AggregationExtractorId;

  /** Type of extractor */
  type: "aggregation";

  /** ID of the associated entity field config */
  entityFieldConfigId: EntityFieldConfigId;

  /** Type of aggregation to perform */
  aggregationType: AggregationType;

  /** ID of the dataset to extract from */
  datasetId: LocalDatasetId;

  /** ID of the specific field in the dataset to aggregate */
  datasetFieldId: LocalDatasetFieldId;

  /** Filter to apply before aggregation */
  filter: JSONValue | undefined;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

type AggregationExtractorInsert = SetOptional<
  AggregationExtractorRead,
  "createdAt" | "filter" | "id" | "updatedAt"
>;

type AggregationExtractorUpdate = Partial<AggregationExtractorRead>;

export type AggregationExtractorCRUDTypes = SupabaseModelCRUDTypes<
  {
    tableName: "value_extractor__aggregation";
    modelName: "AggregationExtractor";
    modelPrimaryKeyType: AggregationExtractorId;
    modelTypes: {
      Read: AggregationExtractorRead;
      Insert: AggregationExtractorInsert;
      Update: AggregationExtractorUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type AggregationExtractor<
  K extends keyof AggregationExtractorCRUDTypes = "Read",
> = Simplify<AggregationExtractorCRUDTypes[K]>;
