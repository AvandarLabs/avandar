import type { Input } from "./UncertaintyUnfold.schema";
/** Fictional estimate with an explicitly authored scenario range. */
export const DEFAULT_INPUT: Input = {
  estimate: {
    label: "Demo preparation time",
    point: 5,
    lower: 3,
    upper: 8,
  },
  axis: {
    min: 0,
    max: 10,
    unit: "hours",
  },
  interval: {
    kind: "scenario-range",
    label: "Illustrative planning range",
  },
  reference: {
    value: 6,
    label: "Demo planning allowance",
  },
  interpretation: "The range spans the planning allowance.",
  showValues: true,
  contextLabel: "Fictional planning example",
};
/** Boundary, maximum copy, changed numeric and extreme finite-span fixtures. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      estimate: { label: "E", lower: 0, point: 0, upper: 1 },
      axis: { min: 0, max: 1, unit: "U" },
      interval: { kind: "measurement-range", label: "I" },
      reference: null,
      interpretation: "A",
      contextLabel: "C",
      showValues: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      estimate: { ...DEFAULT_INPUT.estimate, label: "W".repeat(32) },
      axis: { ...DEFAULT_INPUT.axis, unit: "W".repeat(16) },
      interval: { kind: "confidence-interval", label: "W".repeat(64) },
      reference: { value: 5, label: "W".repeat(32) },
      interpretation: "W".repeat(80),
      contextLabel: "W".repeat(64),
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      axis: { min: -10, max: 10, unit: "units" },
      estimate: { label: "Alternative", lower: -8, point: 2, upper: 2 },
      reference: { value: 7, label: "Outside the interval" },
      interpretation: "The reference is above the supplied range.",
    },
  },
  {
    id: "extreme-span",
    input: {
      ...DEFAULT_INPUT,
      axis: { min: -1e308, max: 1e308, unit: "units" },
      estimate: {
        label: "Finite extreme range",
        lower: -1e308,
        point: 0,
        upper: 1e308,
      },
      reference: { value: 0, label: "Central reference" },
    },
  },
];
/** Strict numeric, shape and relationship rejections. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, axis: { ...DEFAULT_INPUT.axis, max: 0 } },
  { ...DEFAULT_INPUT, axis: { ...DEFAULT_INPUT.axis, min: -Infinity } },
  ...[
    { lower: 5, point: 5, upper: 5 },
    { lower: 8, point: 5, upper: 3 },
    { lower: 3, point: 9, upper: 8 },
    { lower: -1, point: 5, upper: 8 },
  ].map((estimate) => ({
    ...DEFAULT_INPUT,
    estimate: { label: "E", ...estimate },
  })),
  { ...DEFAULT_INPUT, reference: { value: 11, label: "R" } },
  { ...DEFAULT_INPUT, reference: { value: 5, label: "R", extra: true } },
  { ...DEFAULT_INPUT, interval: { kind: "unknown", label: "I" } },
];
