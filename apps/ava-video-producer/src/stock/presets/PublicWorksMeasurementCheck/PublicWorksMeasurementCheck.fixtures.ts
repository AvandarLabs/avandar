import { DEFAULT_INPUT } from "./defaultInput";
import type { Input } from "./PublicWorksMeasurementCheck.schema";

export { DEFAULT_INPUT as defaultInput } from "./defaultInput";
export { invalidInputs } from "./invalidInputs";
/** Accepted minimum, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      specification: { ...DEFAULT_INPUT.specification, length: 1 },
      observation: { ...DEFAULT_INPUT.observation, length: 1 },
      observers: [
        { ...DEFAULT_INPUT.observers[0], id: "", label: "" },
        { ...DEFAULT_INPUT.observers[1], id: " 人", label: "" },
      ],
      showDifference: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      specification: {
        ...DEFAULT_INPUT.specification,
        label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        unit: "界界界界界界界界界界界界界界界界界界",
      },
      observation: {
        ...DEFAULT_INPUT.observation,
        label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        length: 8,
        sourceLabel:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      observers: [
        {
          ...DEFAULT_INPUT.observers[0],
          label: "界界界界界界界界界界界界界界界界界界界界界界界界",
        },
        {
          ...DEFAULT_INPUT.observers[1],
          label: "界界界界界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      labels: {
        ...DEFAULT_INPUT.labels,
        specification:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        observation:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        difference:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        example:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      structure: "handrail",
      specification: { ...DEFAULT_INPUT.specification, length: 3.5 },
      observation: { ...DEFAULT_INPUT.observation, length: 5.25 },
    },
  },
];
