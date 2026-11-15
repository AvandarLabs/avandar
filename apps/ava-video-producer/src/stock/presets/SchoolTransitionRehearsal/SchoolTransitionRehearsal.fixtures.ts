import { DEFAULT_INPUT } from "./defaultInput";
import type { Input } from "./SchoolTransitionRehearsal.schema";

export { DEFAULT_INPUT as defaultInput } from "./defaultInput";
export { invalidInputs } from "./invalidInputs";
/** Accepted minimum, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      stops: [
        { ...DEFAULT_INPUT.stops[0], id: "" },
        { ...DEFAULT_INPUT.stops[1], id: " 教室" },
      ],
      showPracticeStrip: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      people: {
        ...DEFAULT_INPUT.people,
        learner: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
        companion: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      stops: [
        {
          ...DEFAULT_INPUT.stops[0],
          label: "界界界界界界界界界界界界界界界界界界界界界界界界",
          actionLabel:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
        {
          ...DEFAULT_INPUT.stops[1],
          label: "界界界界界界界界界界界界界界界界界界界界界界界界",
          actionLabel:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      labels: {
        ...DEFAULT_INPUT.labels,
        setting:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        practice:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        choice:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        example:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      finalStepSupport: "alongside",
      labels: { ...DEFAULT_INPUT.labels, choice: "Try with my companion" },
      showFootprints: true,
    },
  },
];
