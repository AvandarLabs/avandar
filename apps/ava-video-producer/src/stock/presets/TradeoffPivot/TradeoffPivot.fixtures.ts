import type { Input } from "./TradeoffPivot.schema";
/** Complete fictional tradeoff and context for its authored priority. */
export const DEFAULT_INPUT: Input = {
  approach: "A fictional pocket notebook",
  gains: [
    {
      id: "carry",
      label: "Fits in a small bag",
    },
    {
      id: "quick",
      label: "Easy to open anywhere",
    },
  ],
  concessions: [
    {
      id: "space",
      label: "Less room for large sketches",
    },
  ],
  sideLabels: {
    gain: "What we gain",
    concession: "What we give up",
  },
  priorityStatement: "For this example, portability comes first",
  revealOrder: "gain-first",
};
/** Both reveal orders, unequal lists and accepted maximum copy. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      approach: "A",
      gains: [{ id: "a", label: "G" }],
      concessions: [{ id: "a", label: "C" }],
      sideLabels: { gain: "G", concession: "C" },
      priorityStatement: "P",
      revealOrder: "concession-first",
    },
  },
  {
    id: "dense",
    input: {
      approach: "界".repeat(40),
      gains: Array.from({ length: 3 }, (_, index) => ({
        id: `gain-${index}`,
        label: "界".repeat(32),
      })),
      concessions: Array.from({ length: 3 }, (_, index) => ({
        id: `cost-${index}`,
        label: "界".repeat(32),
      })),
      sideLabels: { gain: "界".repeat(22), concession: "界".repeat(22) },
      priorityStatement: "界".repeat(58),
      revealOrder: "gain-first",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      approach: "A fictional relationship-led service",
      gains: [{ id: "trust", label: "Time to understand each team" }],
      concessions: [
        { id: "effort", label: "More time for each relationship" },
        { id: "reach", label: "Slower initial reach" },
      ],
      priorityStatement: "For this context, durable relationships come first",
      revealOrder: "concession-first",
    },
  },
];
/**
 * Strict bounded sides do not accept invented numeric weights or missing copy.
 */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, gains: [] },
  { ...DEFAULT_INPUT, concessions: [] },
  { ...DEFAULT_INPUT, gains: [DEFAULT_INPUT.gains[0], DEFAULT_INPUT.gains[0]] },
  {
    ...DEFAULT_INPUT,
    concessions: [DEFAULT_INPUT.concessions[0], DEFAULT_INPUT.concessions[0]],
  },
  { ...DEFAULT_INPUT, gains: [{ ...DEFAULT_INPUT.gains[0], weight: 1 }] },
  { ...DEFAULT_INPUT, approach: "A".repeat(41) },
  { ...DEFAULT_INPUT, priorityStatement: "P".repeat(59) },
  { ...DEFAULT_INPUT, revealOrder: "balanced" },
];
