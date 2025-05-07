import { Enums } from "@/types/database.types";
import { AggregationExtractorCRUDTypes } from "./AggregationExtractor/types";
import { DatasetColumnValueExtractorCRUDTypes } from "./DatasetColumnValueExtractor/types";
import { ManualEntryExtractorCRUDTypes } from "./ManualEntryExtractor/types";

export type EntityFieldValueExtractorType =
  Enums<"entity_field_config__value_extractor_type">;

// Value extractor types for each field class
export type DimensionExtractorType = "dataset_column_value" | "manual_entry";
export type MetricExtractorType = "aggregation";

export type EntityFieldValueExtractorCRUDTypesRegistry = {
  aggregation: AggregationExtractorCRUDTypes;
  manual_entry: ManualEntryExtractorCRUDTypes;
  dataset_column_value: DatasetColumnValueExtractorCRUDTypes;
};

export type EntityFieldValueExtractorRegistry<
  T extends "Read" | "Insert" | "Update" = "Read",
> = {
  // eslint-disable-next-line max-len
  [K in EntityFieldValueExtractorType]: EntityFieldValueExtractorCRUDTypesRegistry[K][T];
};

export type EntityFieldValueExtractor<
  T extends "Read" | "Insert" | "Update" = "Read",
> = EntityFieldValueExtractorRegistry<T>[EntityFieldValueExtractorType];

export type EntityFieldValueExtractorId =
  EntityFieldValueExtractorRegistry<"Read">[EntityFieldValueExtractorType]["id"];
