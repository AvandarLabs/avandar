import { Enums } from "@/types/database.types";
import { AggregationExtractorModel } from "./AggregationExtractor/types";
import { DatasetColumnValueExtractorModel } from "./DatasetColumnValueExtractor/types";
import { ManualEntryExtractorModel } from "./ManualEntryExtractor/types";

export type ValueExtractorType =
  Enums<"entity_field_configs__value_extractor_type">;

// Value extractor types for each field class
export type DimensionExtractorType = "dataset_column_value" | "manual_entry";
export type MetricExtractorType = "aggregation";

/**
 * Registry that maps extractor types to their CRUD model definitions.
 */
export type EntityFieldValueExtractorModelRegistry = {
  aggregation: AggregationExtractorModel;
  manual_entry: ManualEntryExtractorModel;
  dataset_column_value: DatasetColumnValueExtractorModel;
};

/**
 * Value extractor registry to access a value extractor model with a CRUD
 * method passed as a generic.
 */
export type EntityFieldValueExtractorRegistry<
  T extends "Read" | "Insert" | "Update" = "Read",
> = {
  [K in ValueExtractorType]: EntityFieldValueExtractorModelRegistry[K][T];
};

/**
 * Get a value extractor model with a CRUD method and ValueExtractorType
 * passed as generics. This is a helpful type to also get the union of all
 * value extractor models given a CRUD method.
 *
 * For example:
 * ```
 * // Union of all value extractor "Read" models
 * EntityFieldValueExtractor<"Read">
 * ```
 */
export type EntityFieldValueExtractor<
  T extends "Read" | "Insert" | "Update" = "Read",
  ExtractorType extends ValueExtractorType = ValueExtractorType,
> = EntityFieldValueExtractorRegistry<T>[ExtractorType];

export type EntityFieldValueExtractorId =
  EntityFieldValueExtractorRegistry<"Read">[ValueExtractorType]["id"];
