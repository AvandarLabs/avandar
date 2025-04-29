import { SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { Enums } from "@/types/database.types";
import type { EntityConfigId } from "../types";
import type { UUID } from "@/lib/types/common";

export type EntityFieldConfigId = UUID<"EntityFieldConfig">;

// Enum types to match database enums
export type EntityFieldClass = Enums<"entity_field_config__class">;
export type EntityFieldBaseType = Enums<"entity_field_config__base_data_type">;
export type EntityFieldValueExtractorType =
  Enums<"entity_field_config__value_extractor_type">;

// Base data types for each field classe
export type DimensionFieldBaseDataType = Extract<
  EntityFieldBaseType,
  "string" | "number" | "date"
>;
export type MetricFieldBaseDataType = Extract<EntityFieldBaseType, "number">;

// Value extractor types for each field class
export type DimensionExtractorType = "dataset_column_value" | "manual_entry";
export type MetricExtractorType = "aggregation";

type DimensionRead = {
  class: "dimension";
  baseDataType: DimensionFieldBaseDataType;
  valueExtractorType: DimensionExtractorType;
  isTitleField: boolean;
  isIdField: boolean;
  allowManualEdit: boolean;
  isArray: boolean;
};

type MetricRead = {
  class: "metric";
  baseDataType: MetricFieldBaseDataType;
  valueExtractorType: MetricExtractorType;

  /** Metrics can never be title fields */
  isTitleField: false; // metrics can never be title fields

  /** Metrics can never be id fields */
  isIdField: false;

  /** Metrics should never allow manual edits */
  allowManualEdit: false;

  /** Metrics should not allow arrays of values */
  isArray: false;
};

type CoreFieldRead = {
  id: EntityFieldConfigId;
  entityConfigId: EntityConfigId;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type EntityFieldConfigRead = CoreFieldRead & (DimensionRead | MetricRead);

type EntityFieldConfigInsert = SetOptional<
  Required<CoreFieldRead>,
  "id" | "createdAt" | "updatedAt" | "description"
> &
  (DimensionRead | MetricRead);

type EntityFieldConfigUpdate = Partial<CoreFieldRead> &
  (Partial<DimensionRead> | Partial<MetricRead>);

export type EntityFieldConfigCRUDTypes = SupabaseModelCRUDTypes<
  {
    tableName: "entity_field_configs";
    modelName: "EntityFieldConfig";
    modelPrimaryKeyType: EntityFieldConfigId;
  },
  {
    Read: EntityFieldConfigRead;
    Insert: EntityFieldConfigInsert;
    Update: EntityFieldConfigUpdate;
  },
  {
    dbTablePrimaryKey: "id";
    modelPrimaryKey: "id";
  }
>;

export type EntityFieldConfig<
  K extends keyof EntityFieldConfigCRUDTypes = "Read",
> = Simplify<EntityFieldConfigCRUDTypes[K]>;
