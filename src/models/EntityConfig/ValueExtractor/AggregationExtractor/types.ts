import { SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetColumnId } from "@/models/datasets/DatasetColumn";
import { WorkspaceId } from "@/models/Workspace/types";
import { EntityFieldConfigId } from "../../EntityFieldConfig/EntityFieldConfig.types";
import type { JSONValue, UUID } from "@/lib/types/common";

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

  /** ID of the associated workspace */
  workspaceId: WorkspaceId;

  /** ID of the associated entity field config */
  entityFieldConfigId: EntityFieldConfigId;

  /** Type of aggregation to perform */
  aggregationType: AggregationType;

  /** ID of the dataset to extract from */
  datasetId: DatasetId;

  /** ID of the specific field in the dataset to aggregate */
  datasetFieldId: DatasetColumnId;

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

export type AggregationExtractorModel = SupabaseModelCRUDTypes<
  {
    tableName: "value_extractors__aggregation";
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
  K extends keyof AggregationExtractorModel = "Read",
> = Simplify<AggregationExtractorModel[K]>;
