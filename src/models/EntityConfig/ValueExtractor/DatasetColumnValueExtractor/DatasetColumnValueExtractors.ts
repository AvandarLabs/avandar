import { registry } from "$/lib/utils/objects/registry/registry";
import { ValuePickerRuleType } from "./DatasetColumnValueExtractor.types";

export const DatasetColumnValueExtractors = {
  ValuePickerTypes: registry<ValuePickerRuleType>().keys(
    "most_frequent",
    "first",
    "sum",
    "avg",
    "count",
    "max",
    "min",
  ),

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
