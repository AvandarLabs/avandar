import { registryKeys } from "@/lib/utils/objects/misc";
import { ValuePickerRuleType } from "./DatasetColumnValueExtractor.types";

export const DatasetColumnValueExtractors = {
  ValuePickerTypes: registryKeys<ValuePickerRuleType>({
    most_frequent: true,
    first: true,
    sum: true,
    avg: true,
    count: true,
    max: true,
    min: true,
  }),

  ValuePickerMetadata: {
    most_frequent: {
      type: "most_frequent",
      displayName: "Most frequent",
    },
    first: {
      type: "first",
      displayName: "First",
    },
    sum: {
      type: "sum",
      displayName: "Sum",
    },
    avg: {
      type: "avg",
      displayName: "Average",
    },
    count: {
      type: "count",
      displayName: "Count",
    },
    max: {
      type: "max",
      displayName: "Max",
    },
    min: {
      type: "min",
      displayName: "Min",
    },
  } as const satisfies {
    [TRule in ValuePickerRuleType]: {
      type: TRule;
      displayName: string;
    };
  },
};
