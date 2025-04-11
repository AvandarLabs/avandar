import { DatasetFieldId } from "./DatasetField";
import { DatasetId } from "./LocalDataset";
import type { UUID } from "@/lib/types/common";

export type EntityFieldConfigId = UUID<"EntityFieldConfig">;

type DimensionFieldBaseType = "string" | "number" | "date";

type MetricFieldBaseType = "number";

export type EntityFieldConfig = {
  id: EntityFieldConfigId;
  name: string;
  description?: string;
} & (
  | {
      class: "dimension";
      baseType: DimensionFieldBaseType;
      isArray: boolean;
      allowManualEdit: boolean;
      valueExtractor:
        | {
            extractorType: "adjacentField";
            valuePickerRule: "mostFrequent" | "first";
            allowManualEdit: boolean;
            dataset: DatasetId;
            field: DatasetFieldId;
          }
        | {
            extractorType: "manualEntry";
            allowManualEdit: true;
          };
    }
  | {
      class: "metric";
      baseType: MetricFieldBaseType;
      valueExtractor: {
        extractorType: "aggregation";
        aggregation: "sum" | "max" | "count";
        dataset: DatasetId;
        field: DatasetFieldId;
        filter: unknown;
      };
    }
);

/**
 * Make an EntityFieldConfig. For now, we create something filled with lots
 * of defaults, but eventually these should all be inputs in the function.
 * @returns
 */
export function makeEntityFieldConfig({
  id,
  name,
}: Pick<EntityFieldConfig, "id" | "name">): EntityFieldConfig {
  return {
    id,
    name,
    description: undefined,
    class: "dimension",
    baseType: "string",
    isArray: false,
    allowManualEdit: false,
    valueExtractor: {
      extractorType: "manualEntry",
      allowManualEdit: true,
    },
  };
}
