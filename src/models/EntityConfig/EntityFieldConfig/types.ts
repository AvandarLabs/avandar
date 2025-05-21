import { Merge, SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { Enums } from "@/types/database.types";
import {
  DimensionExtractorType,
  MetricExtractorType,
} from "../ValueExtractor/types";
import type { EntityConfigId } from "../types";
import type { UUID } from "@/lib/types/common";

export type EntityFieldConfigId = UUID<"EntityFieldConfig">;

// Enum types to match database enums
export type EntityFieldClass = Enums<"entity_field_config__class">;
export type EntityFieldBaseType = Enums<"entity_field_config__base_data_type">;

// Base data types for each field classe
export type DimensionFieldBaseDataType = Extract<
  EntityFieldBaseType,
  "string" | "number" | "date"
>;
export type MetricFieldBaseDataType = Extract<EntityFieldBaseType, "number">;

export type DimensionRead = {
  class: "dimension";
  baseDataType: DimensionFieldBaseDataType;
  valueExtractorType: DimensionExtractorType;
  isTitleField: boolean;
  isIdField: boolean;
  allowManualEdit: boolean;
  isArray: boolean;
};

export type MetricRead = {
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

type EntityFieldConfigRead = {
  id: EntityFieldConfigId;
  entityConfigId: EntityConfigId;
  name: string;
  description: string | undefined;
  createdAt: string;
  updatedAt: string;
  options: DimensionRead | MetricRead;
};

type EntityFieldConfigInsert = Merge<
  SetOptional<
    EntityFieldConfigRead,
    "id" | "createdAt" | "updatedAt" | "description"
  >,
  {
    options:
      | SetOptional<
          DimensionRead,
          "allowManualEdit" | "isArray" | "isTitleField" | "isIdField"
        >
      | SetOptional<
          MetricRead,
          "allowManualEdit" | "isArray" | "isTitleField" | "isIdField"
        >;
  }
>;

type EntityFieldConfigUpdate = Merge<
  Partial<EntityFieldConfigRead>,
  {
    options: Partial<DimensionRead> | Partial<MetricRead>;
  }
>;

export type EntityFieldConfigModel = SupabaseModelCRUDTypes<
  {
    tableName: "entity_field_configs";
    modelName: "EntityFieldConfig";
    modelPrimaryKeyType: EntityFieldConfigId;
    modelTypes: {
      Read: EntityFieldConfigRead;
      Insert: EntityFieldConfigInsert;
      Update: EntityFieldConfigUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type EntityFieldConfig<K extends keyof EntityFieldConfigModel = "Read"> =
  Simplify<EntityFieldConfigModel[K]>;
