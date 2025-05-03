import { Enums } from "@/types/database.types";
import {
  AggregationExtractor,
  AggregationExtractorId,
} from "./AggregationExtractor/types";
import {
  DatasetColumnValueExtractor,
  DatasetColumnValueExtractorId,
} from "./DatasetColumnValueExtractor/types";
import {
  ManualEntryExtractor,
  ManualEntryExtractorId,
} from "./ManualEntryExtractor/types";

export type EntityFieldValueExtractorType =
  Enums<"entity_field_config__value_extractor_type">;

// Value extractor types for each field class
export type DimensionExtractorType = "dataset_column_value" | "manual_entry";
export type MetricExtractorType = "aggregation";

export type EntityFieldValueExtractor =
  | AggregationExtractor
  | ManualEntryExtractor
  | DatasetColumnValueExtractor;

export type EntityFieldValueExtractorId =
  | AggregationExtractorId
  | ManualEntryExtractorId
  | DatasetColumnValueExtractorId;

export type EntityFieldValueExtractorRegistry = {
  aggregation: AggregationExtractor;
  manual_entry: ManualEntryExtractor;
  dataset_column_value: DatasetColumnValueExtractor;
};
