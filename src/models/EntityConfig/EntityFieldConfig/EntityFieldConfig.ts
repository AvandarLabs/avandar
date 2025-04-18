import { SetRequired } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { DatasetFieldId } from "@/models/DatasetField";
import { DatasetId } from "@/models/LocalDataset";
import { EntityConfigId } from "../EntityConfig";
import type { UUID } from "@/lib/types/common";
import type { DefineModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";

export type EntityFieldConfigId = UUID<"EntityFieldConfig">;

export type EntityFieldClassType = "dimension" | "metric";
export type DimensionFieldBaseType = "string" | "number" | "date";
export type MetricFieldBaseType = "number";

type AdjacentFieldExtractor = {
  extractorType: "adjacentField";
  valuePickerRule: "mostFrequent" | "first";
  allowManualEdit: boolean;
  datasetId: DatasetId;
  datasetFieldId: DatasetFieldId;
};

type ManualEntryExtractor = {
  extractorType: "manualEntry";
  allowManualEdit: true;
};

type AggregationExtractor = {
  extractorType: "aggregation";
  aggregation: "sum" | "max" | "count";
  datasetId: DatasetId;
  datasetFieldId: DatasetFieldId;
  filter?: unknown;
};

type DimensionRead = {
  class: "dimension";
  baseType: DimensionFieldBaseType;
  isArray: boolean;
  isTitleField: boolean;
  isIdField: boolean;
  valueExtractor: AdjacentFieldExtractor | ManualEntryExtractor;
};

type MetricRead = {
  class: "metric";
  baseType: MetricFieldBaseType;
  isTitleField: false;
  isIdField: false;
  valueExtractor: AggregationExtractor;
};

type EntityConfigReadCore = {
  id: EntityFieldConfigId;
  entityConfigId: EntityConfigId;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EntityFieldConfigCRUDTypes = DefineModelCRUDTypes<
  SupabaseModelCRUDTypes<"entity_field_configs">,
  {
    modelName: "EntityFieldConfig";
    dbTablePrimaryKey: "id";
    modelPrimaryKey: "id";
    Read: EntityConfigReadCore & (DimensionRead | MetricRead);
    Insert: SetRequired<
      Partial<EntityConfigReadCore>,
      "entityConfigId" | "name"
    > &
      (
        | SetRequired<
            Partial<DimensionRead>,
            "baseType" | "class" | "valueExtractor"
          >
        | SetRequired<
            Partial<MetricRead>,
            "baseType" | "class" | "valueExtractor"
          >
      );
    Update: Partial<EntityConfigReadCore> &
      (Partial<DimensionRead> | Partial<MetricRead>);
  }
>;

export type EntityFieldConfig<
  K extends keyof EntityFieldConfigCRUDTypes = "Read",
> = EntityFieldConfigCRUDTypes[K];
