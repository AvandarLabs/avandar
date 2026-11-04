import { DEFAULT_INPUT } from "./defaultInput";
import type { Input } from "./InterpretedCaseDialogue.schema";

export { DEFAULT_INPUT as defaultInput } from "./defaultInput";
export { invalidInputs } from "./invalidInputs";
/** Accepted minimum, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      turns: [
        { ...DEFAULT_INPUT.turns[0], id: "", originalText: "" },
        { ...DEFAULT_INPUT.turns[1], id: " 声" },
      ],
      showSightlines: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      people: {
        ...DEFAULT_INPUT.people,
        participant: "界界界界界界界界界界界界界界界界界界界界界界界界",
        worker: "界界界界界界界界界界界界界界界界界界界界界界界界",
        interpreter: "界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      languages: {
        ...DEFAULT_INPUT.languages,
        participant: "界界界界界界界界界界界界界界界界界界界界界界",
        worker: "界界界界界界界界界界界界界界界界界界界界界界",
      },
      turns: [
        {
          ...DEFAULT_INPUT.turns[0],
          originalText:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
          interpretedText:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
        {
          ...DEFAULT_INPUT.turns[1],
          originalText:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
          interpretedText:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      labels: {
        ...DEFAULT_INPUT.labels,
        original:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        interpreted:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        example:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      turns: [
        {
          ...DEFAULT_INPUT.turns[0],
          originalText: "Morning is best.",
          interpretedText: "The supplied interpretation.",
        },
        DEFAULT_INPUT.turns[1],
      ],
      showSightlines: false,
      bubbleLayout: "stacked",
    },
  },
];
