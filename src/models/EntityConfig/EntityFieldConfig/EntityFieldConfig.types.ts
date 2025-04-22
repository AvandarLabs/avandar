import { SetRequired, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import type { EntityConfigId } from "../EntityConfig.types";
import type { UUID } from "@/lib/types/common";
import type { DefineModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";

export type EntityFieldConfigId = UUID<"EntityFieldConfig">;

// Base data types for each field classe
export type DimensionFieldBaseDataType = "string" | "number" | "date";
export type MetricFieldBaseDataType = "number";

// Value extractor types for each field class
export type DimensionExtractorType = "adjacent_field" | "manual_entry";
export type MetricExtractorType = "aggregation";

// Enum types to match database enums
export type EntityFieldClass = EntityFieldConfigRead["class"];
export type EntityFieldBaseType = EntityFieldConfigRead["baseDataType"];
export type EntityFieldExtractorType = Simplify<
  EntityFieldConfigRead["extractorType"]
>;

type DimensionRead = {
  class: "dimension";
  baseDataType: DimensionFieldBaseDataType;
  extractorType: DimensionExtractorType;
  isTitleField: boolean;
  isIdField: boolean;
  isArray: boolean;
  allowManualEdit: boolean;
};

type MetricRead = {
  class: "metric";
  baseDataType: MetricFieldBaseDataType;
  extractorType: MetricExtractorType;
  isTitleField: false;
  isIdField: false;
  allowManualEdit: false; // metrics should never allow manual edits
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

export type EntityFieldConfigCRUDTypes = DefineModelCRUDTypes<
  SupabaseModelCRUDTypes<"entity_field_configs">,
  {
    modelName: "EntityFieldConfig";
    modelPrimaryKey: "id";
    dbTablePrimaryKey: "id";
    Read: EntityFieldConfigRead;
    Insert: SetRequired<Partial<CoreFieldRead>, "entityConfigId" | "name"> &
      (
        | SetRequired<
            Partial<DimensionRead>,
            "baseDataType" | "class" | "extractorType"
          >
        | SetRequired<
            Partial<MetricRead>,
            "baseDataType" | "class" | "extractorType"
          >
      );
    Update: Partial<CoreFieldRead> &
      (Partial<DimensionRead> | Partial<MetricRead>);
  }
>;

export type EntityFieldConfig<
  K extends keyof EntityFieldConfigCRUDTypes = "Read",
> = Simplify<EntityFieldConfigCRUDTypes[K]>;
