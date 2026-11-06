import type { Input } from "./ContactWindowOverlap.schema";
/** Complete fictional default, replaced only as a whole input. */
export const DEFAULT_INPUT: Input = {
  records: [
    { id: "a", label: "Person A", start: 1, end: 4 },
    { id: "b", label: "Person B", start: 4, end: 6 },
    { id: "c", label: "Person C", start: 7, end: 9 },
    { id: "d", label: "Person D", start: null, end: null },
  ],
  investigationWindow: { start: 3, end: 6, label: "Supplied review window" },
  axis: {
    start: 0,
    end: 10,
    unitLabel: "Relative time units",
    venueLabel: "Example market",
  },
  sceneLabel: "Fictional example",
  showOverlapFractions: true,
  copy: {
    overlap: "Recorded overlap",
    none: "No recorded overlap",
    unknown: "Time unknown",
    denominator: "People in supplied records",
    qualifier: "Overlap does not prove transmission",
  },
};
const minimum: Input = {
  ...DEFAULT_INPUT,
  records: [
    { id: "", label: "", start: null, end: null },
    { id: "界 space", label: "", start: null, end: null },
  ],
};
const BOUNDS: Array<[number | null, number | null]> = [
  [1, 4],
  [0, 10],
  [3, 6],
  [0, 3],
  [6, 8],
  [null, null],
];
const dense: Input = {
  ...DEFAULT_INPUT,
  records: BOUNDS.map(([start, end], index) => ({
    id: `p${index}`,
    label: "界".repeat(18),
    start,
    end,
  })),
  investigationWindow: {
    ...DEFAULT_INPUT.investigationWindow,
    label: "界".repeat(28),
  },
  axis: {
    ...DEFAULT_INPUT.axis,
    unitLabel: "界".repeat(24),
    venueLabel: "界".repeat(24),
  },
  sceneLabel: "界".repeat(40),
  copy: Object.fromEntries(
    Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "界".repeat(42)]),
  ) as Input["copy"],
};
const changed: Input = {
  ...DEFAULT_INPUT,
  investigationWindow: {
    ...DEFAULT_INPUT.investigationWindow,
    start: 4,
    end: 7,
  },
};
const toggles: Input = { ...changed, showOverlapFractions: false };
/** Invalid shape, identity and semantic relationship samples. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, records: [] },
  {
    ...DEFAULT_INPUT,
    records: [DEFAULT_INPUT.records[0], DEFAULT_INPUT.records[0]],
  },
  ...[
    [null, 4],
    [4, 4],
    [0, 11],
  ].map(([start, end]) => ({
    ...DEFAULT_INPUT,
    records: [
      { ...DEFAULT_INPUT.records[0], start, end },
      DEFAULT_INPUT.records[1],
    ],
  })),
];
/** Accepted minimum, dense, changed and disabled-display examples. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
  { id: "toggles", input: toggles },
];
