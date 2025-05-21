import { ValueExtractorType } from "../ValueExtractor/types";

export const EntityFieldValueExtractorTypes = {
  manual_entry: {
    type: "manual_entry",
    displayName: "Manual entry",
  },
  dataset_column_value: {
    type: "dataset_column_value",
    displayName: "Dataset column value",
  },
  aggregation: {
    type: "aggregation",
    displayName: "Aggregation",
  },
} as const satisfies {
  [T in ValueExtractorType]: {
    type: T;
    displayName: string;
  };
};
