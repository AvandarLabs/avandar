import type { Input } from "./KeyedRowZipper.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  leftRows: [
    {
      key: "A",
      value: "Paper",
    },
    {
      key: "B",
      value: "Ink",
    },
    {
      key: "C",
      value: "Labels",
    },
  ],
  rightRows: [
    {
      key: "A",
      value: "Bay A",
    },
    {
      key: "C",
      value: "Bay C",
    },
    {
      key: "D",
      value: "Bay D",
    },
  ],
  joinType: "left",
  labels: {
    title: "Fictional item lookup",
    left: "Item",
    right: "Location",
    key: "Key",
    result: "Joined records",
    unmatched: "Unmatched input",
    missing: "No match",
  },
  showKeys: true,
  showUnmatchedTray: true,
};
/** Boundary and changed documents exercise exact keys and context toggles. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      leftRows: [{ key: " ", value: "" }],
      rightRows: [{ key: " ", value: "" }],
      labels: { ...DEFAULT_INPUT.labels, title: "" },
      showKeys: false,
      showUnmatchedTray: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      leftRows: Array.from({ length: 4 }, (_, index) => ({
        key: `ABCDEFGH${index}X`,
        value: "W".repeat(24),
      })),
      rightRows: [0, 4, 5, 6].map((index) => ({
        key: `ABCDEFGH${index}X`,
        value: "W".repeat(24),
      })),
      labels: {
        title: "W".repeat(40),
        left: "W".repeat(24),
        right: "W".repeat(24),
        key: "W".repeat(24),
        result: "W".repeat(24),
        unmatched: "W".repeat(24),
        missing: "W".repeat(24),
      },
      joinType: "inner",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      leftRows: [
        { key: "A B", value: "Matched" },
        { key: "A  B", value: "Left only" },
      ],
      rightRows: [
        { key: "A B", value: "Exact" },
        { key: "A·B", value: "Right only" },
      ],
      joinType: "inner",
    },
  },
  {
    id: "left-hidden",
    input: { ...DEFAULT_INPUT, showKeys: false, showUnmatchedTray: false },
  },
];
/** Incomplete, extra, ambiguous and unsupported joins are rejected. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, leftRows: [] },
  { ...DEFAULT_INPUT, leftRows: [{ key: "", value: "" }] },
  { ...DEFAULT_INPUT, rightRows: [{ key: "Z", value: "" }] },
  {
    ...DEFAULT_INPUT,
    leftRows: [DEFAULT_INPUT.leftRows[0], DEFAULT_INPUT.leftRows[0]],
  },
  { ...DEFAULT_INPUT, rightRows: [{ key: "A", value: "W".repeat(25) }] },
  { ...DEFAULT_INPUT, joinType: "outer" },
];
