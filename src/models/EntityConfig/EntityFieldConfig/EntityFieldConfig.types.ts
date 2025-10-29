import { Merge, SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { WorkspaceId } from "@/models/Workspace/types";
import { Enums } from "@/types/database.types";
import {
  DimensionExtractorType,
  MetricExtractorType,
} from "../ValueExtractor/types";
import type { EntityConfigId } from "../EntityConfig.types";
import type { UUID } from "@/lib/types/common";
import type { AvaDataType } from "@/models/datasets/AvaDataType";
import { Model } from "@/models/Model";

export type EntityFieldConfigId = UUID<"EntityFieldConfig">;

// Enum types to match database enums
export type EntityFieldClass = Enums<"entity_field_configs__class">;

// Base data types for each field classe
export type DimensionFieldBaseDataType = Extract<
  AvaDataType,
  "varchar" | "bigint" | "double" | "time" | "date" | "timestamp" | "boolean"
>;
export type MetricFieldBaseDataType = Extract<AvaDataType, "bigint" | "double">;

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

type EntityFieldConfigRead = Model<"EntityFieldConfig", {
  id: EntityFieldConfigId;
  entityConfigId: EntityConfigId;
  workspaceId: WorkspaceId;
  name: string;
  description: string | undefined;
  createdAt: string;
  updatedAt: string;
  options: DimensionRead | MetricRead;
}>;

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
