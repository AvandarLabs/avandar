import { DatasetFieldId } from "./DatasetField";
import { DatasetId } from "./LocalDataset";
import type { UUID } from "@/lib/types/common";

export type EntityFieldConfigId = UUID;

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
      valuePickerRule: "mostFrequent" | "first";
      valueExtractor:
        | {
            extractorType: "adjacentField";
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
