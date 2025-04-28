import { ValuePickerRuleType } from "./types";

export const ValuePickerRuleTypes = {
  most_frequent: {
    type: "most_frequent",
    displayName: "Most frequent",
  },
  first: {
    type: "first",
    displayName: "First",
  },
} as const satisfies {
  [T in ValuePickerRuleType]: {
    type: T;
    displayName: string;
  };
};
