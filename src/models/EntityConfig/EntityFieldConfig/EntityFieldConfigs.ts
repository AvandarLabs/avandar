import { ValueExtractorType } from "../ValueExtractor/types";

export const EntityFieldConfigs = {
  ValueExtractorTypesMetadata: {
    manual_entry: {
      type: "manual_entry",
      displayName: "Manual entry",
    },
    dataset_column_value: {
      type: "dataset_column_value",
      displayName: "Dataset column value",
    },
  } as const satisfies {
    [T in ValueExtractorType]: {
      type: T;
      displayName: string;
    };
  },
};
