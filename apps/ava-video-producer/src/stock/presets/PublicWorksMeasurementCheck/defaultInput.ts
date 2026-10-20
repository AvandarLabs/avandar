import type { Input } from "./PublicWorksMeasurementCheck.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  structure: "low-wall",
  specification: {
    label: "Demo published length",
    length: 4,
    unit: "Demo metres",
  },
  observation: {
    label: "Demo observed length",
    length: 3,
    sourceLabel: "Fictional site check",
  },
  observers: [
    {
      id: "a",
      label: "Demo resident A",
    },
    {
      id: "b",
      label: "Demo resident B",
    },
  ],
  showDifference: true,
  labels: {
    specification: "Published promise",
    observation: "Supplied observation",
    difference: "Observed minus promised",
    example: "Fictional measurement example",
  },
};
