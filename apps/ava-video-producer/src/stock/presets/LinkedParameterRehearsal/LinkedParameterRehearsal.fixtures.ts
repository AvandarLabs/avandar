import type { Input } from "./LinkedParameterRehearsal.schema";
/** Complete fictional direct affine rehearsal. */
export const DEFAULT_INPUT: Input = {
  source: {
    label: "Demo batches",
    baseline: 2,
    trial: 4,
    min: 0,
    max: 5,
    unit: "batches",
  },
  outputs: [
    {
      id: "parts",
      label: "Demo parts",
      multiplier: 3,
      offset: 0,
      min: 0,
      max: 15,
      unit: "parts",
    },
    {
      id: "reserve",
      label: "Demo reserve",
      multiplier: -2,
      offset: 12,
      min: 0,
      max: 12,
      unit: "credits",
    },
    {
      id: "rooms",
      label: "Demo rooms",
      multiplier: 0,
      offset: 1,
      min: 0,
      max: 3,
      unit: "rooms",
    },
  ],
  phaseLabels: {
    baseline: "Starting assumption",
    trial: "Try the alternative",
    restored: "Starting values restored",
  },
  showRules: true,
  showBaselineMarkers: true,
  contextLabel: "Fictional arithmetic example",
};
const dense: Input = {
  ...DEFAULT_INPUT,
  source: {
    ...DEFAULT_INPUT.source,
    label: "W".repeat(28),
    unit: "W".repeat(16),
  },
  outputs: [
    ...DEFAULT_INPUT.outputs,
    {
      id: "fourth 界",
      label: "Additional output",
      multiplier: 1,
      offset: 2,
      min: 0,
      max: 10,
      unit: "units",
    },
  ].map((output, index) => ({
    ...output,
    id: `output ${index}`,
    label: "W".repeat(28),
    unit: "W".repeat(16),
  })),
  phaseLabels: {
    baseline: "A".repeat(36),
    trial: "B".repeat(36),
    restored: "C".repeat(36),
  },
  contextLabel: "W".repeat(72),
};
/** Baseline, minimum, dense, changed, extreme and cancellation cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      outputs: [DEFAULT_INPUT.outputs[0], DEFAULT_INPUT.outputs[2]],
      showRules: false,
      showBaselineMarkers: false,
    },
  },
  { id: "dense", input: dense },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      source: { ...DEFAULT_INPUT.source, baseline: 4, trial: 1 },
      showRules: false,
      showBaselineMarkers: false,
    },
  },
  {
    id: "extreme-span",
    input: {
      ...DEFAULT_INPUT,
      source: {
        label: "Extreme source",
        baseline: -1e308,
        trial: 1e308,
        min: -1e308,
        max: 1e308,
        unit: "units",
      },
      outputs: [
        {
          id: "linked",
          label: "Linked",
          multiplier: 1,
          offset: 0,
          min: -1e308,
          max: 1e308,
          unit: "units",
        },
        {
          id: "fixed",
          label: "Independent",
          multiplier: 0,
          offset: 0,
          min: -1e308,
          max: 1e308,
          unit: "units",
        },
      ],
    },
  },
  {
    id: "finite-cancellation",
    input: {
      ...DEFAULT_INPUT,
      source: {
        label: "Finite source",
        baseline: 8e307,
        trial: 1e308,
        min: 0,
        max: 1e308,
        unit: "units",
      },
      outputs: [
        {
          id: "cancel",
          label: "Finite cancellation",
          multiplier: 2,
          offset: -1e308,
          min: 0,
          max: 1e308,
          unit: "units",
        },
        DEFAULT_INPUT.outputs[2],
      ],
    },
  },
];
/** Strict arithmetic, independence and complete-document constraints. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, source: { ...DEFAULT_INPUT.source, trial: 2 } },
  { ...DEFAULT_INPUT, source: { ...DEFAULT_INPUT.source, trial: 6 } },
  { ...DEFAULT_INPUT, outputs: DEFAULT_INPUT.outputs.slice(0, 2) },
  {
    ...DEFAULT_INPUT,
    outputs: DEFAULT_INPUT.outputs.map((output) => ({
      ...output,
      multiplier: 0,
      offset: 1,
    })),
  },
  {
    ...DEFAULT_INPUT,
    outputs: DEFAULT_INPUT.outputs.map((output, index) =>
      index === 0 ? { ...output, max: 7 } : output,
    ),
  },
  {
    ...DEFAULT_INPUT,
    outputs: DEFAULT_INPUT.outputs.map((output, index) =>
      index === 0 ? { ...output, id: "" } : output,
    ),
  },
  {
    ...DEFAULT_INPUT,
    outputs: [...DEFAULT_INPUT.outputs, DEFAULT_INPUT.outputs[0]],
  },
  {
    ...DEFAULT_INPUT,
    outputs: DEFAULT_INPUT.outputs.map((output, index) =>
      index === 0 ? { ...output, multiplier: 1e308 } : output,
    ),
  },
  {
    ...DEFAULT_INPUT,
    outputs: DEFAULT_INPUT.outputs.map((output) => ({
      ...output,
      max: Infinity,
    })),
  },
];
