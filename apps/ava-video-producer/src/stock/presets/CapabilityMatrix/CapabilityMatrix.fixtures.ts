import type { Input } from "./CapabilityMatrix.schema";
/** Complete fictional default with all four independent categorical states. */
export const DEFAULT_INPUT: Input = {
  options: [
    {
      id: "pocket",
      label: "Pocket kit",
    },
    {
      id: "desk",
      label: "Desk kit",
    },
  ],
  capabilities: [
    {
      id: "pencil",
      label: "Pencil",
      cells: [
        {
          optionId: "pocket",
          state: "included",
          note: "",
        },
        {
          optionId: "desk",
          state: "included",
          note: "",
        },
      ],
    },
    {
      id: "ruler",
      label: "Ruler",
      cells: [
        {
          optionId: "pocket",
          state: "absent",
          note: "",
        },
        {
          optionId: "desk",
          state: "included",
          note: "",
        },
      ],
    },
    {
      id: "refill",
      label: "Refill",
      cells: [
        {
          optionId: "pocket",
          state: "conditional",
          note: "On request",
        },
        {
          optionId: "desk",
          state: "unknown",
          note: "Not specified",
        },
      ],
    },
  ],
  stateLabels: {
    included: "Included",
    absent: "Absent",
    conditional: "Conditional",
    unknown: "Unknown",
  },
  focus: {
    kind: "row",
    id: "refill",
  },
  showNotes: true,
  caption: "Fictional kit comparison",
};
const minimumInput: Input = {
  ...DEFAULT_INPUT,
  options: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ],
  capabilities: ["first", "second"].map((id) => ({
    id,
    label: "",
    cells: ["a", "b"].map((optionId) => ({
      optionId,
      state: "unknown",
      note: "",
    })),
  })),
  focus: { kind: "none", id: "" },
  showNotes: false,
  caption: "",
};
const changedInput: Input = {
  ...DEFAULT_INPUT,
  options: [
    { id: "local", label: "Local context" },
    { id: "remote", label: "Network context" },
  ],
  capabilities: [
    {
      id: "query",
      label: "Local querying",
      cells: [
        { optionId: "local", state: "included", note: "" },
        { optionId: "remote", state: "unknown", note: "Not specified" },
      ],
    },
    {
      id: "invite",
      label: "Remote invitations",
      cells: [
        { optionId: "local", state: "absent", note: "Requires network" },
        { optionId: "remote", state: "included", note: "" },
      ],
    },
    {
      id: "sync",
      label: "Optional sync",
      cells: [
        { optionId: "local", state: "conditional", note: "When online" },
        { optionId: "remote", state: "conditional", note: "When enabled" },
      ],
    },
  ],
  focus: { kind: "column", id: "local" },
  caption: "Authored availability by operation",
};
/** Complete fixtures own their collection counts and maximum accepted text. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      caption: "界".repeat(48),
      options: ["a", "b", "c"].map((id) => ({ id, label: "界".repeat(18) })),
      capabilities: Array.from({ length: 5 }, (_, index) => ({
        id: `row-${index}`,
        label: "界".repeat(22),
        cells: ["a", "b", "c"].map((optionId, cellIndex) => ({
          optionId,
          state: (["included", "absent", "conditional", "unknown"] as const)[
            (index + cellIndex) % 4
          ],
          note: "界".repeat(18),
        })),
      })),
      stateLabels: {
        included: "界".repeat(14),
        absent: "界".repeat(14),
        conditional: "界".repeat(14),
        unknown: "界".repeat(14),
      },
      focus: { kind: "column", id: "c" },
    },
  },
  { id: "changed", input: changedInput },
];
/** Exact coverage, strict keys and focus rejection cases. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    options: [DEFAULT_INPUT.options[0], DEFAULT_INPUT.options[0]],
  },
  {
    ...DEFAULT_INPUT,
    capabilities: [
      DEFAULT_INPUT.capabilities[0],
      DEFAULT_INPUT.capabilities[0],
    ],
  },
  { ...DEFAULT_INPUT, focus: { kind: "row", id: "missing" } },
  { ...DEFAULT_INPUT, focus: { kind: "column", id: "missing" } },
  { ...DEFAULT_INPUT, focus: { kind: "none", id: "desk" } },
  ...[
    [{ optionId: "pocket", state: "unknown", note: "" }],
    [
      { optionId: "pocket", state: "unknown", note: "" },
      { optionId: "missing", state: "absent", note: "" },
    ],
    [
      { optionId: "pocket", state: "unknown", note: "" },
      { optionId: "pocket", state: "absent", note: "" },
    ],
    [
      { optionId: "pocket", state: "conditional", note: " " },
      { optionId: "desk", state: "unknown", note: "" },
    ],
    [
      { optionId: "pocket", state: "included", note: "", extra: true },
      { optionId: "desk", state: "unknown", note: "" },
    ],
  ].map((cells) => ({
    ...DEFAULT_INPUT,
    capabilities: [
      { ...DEFAULT_INPUT.capabilities[0], cells },
      DEFAULT_INPUT.capabilities[1],
    ],
  })),
];

/**
 * Accepted word and hard-break copy exercises the complete visible label
 * domain.
 */
export const textRegressionInputs: Array<{
  id: string;
  input: Input;
  text: string;
}> = [
  {
    id: "row-spaced",
    text: [7, 7, 6].map((length) => "界".repeat(length)).join(" "),
    input: {
      ...DEFAULT_INPUT,
      capabilities: DEFAULT_INPUT.capabilities.map((row, index) =>
        index
          ? row
          : {
              ...row,
              label: [7, 7, 6].map((length) => "界".repeat(length)).join(" "),
            },
      ),
    },
  },
  {
    id: "all-label-breaks",
    text: "A\nB\tC\nD\nE",
    input: {
      ...DEFAULT_INPUT,
      caption: "A\nB\tC\nD\nE",
      options: DEFAULT_INPUT.options.map((option) => ({
        ...option,
        label: "A\nB\tC\nD\nE",
      })),
      capabilities: DEFAULT_INPUT.capabilities.map((row) => ({
        ...row,
        label: "A\nB\tC\nD\nE",
        cells: row.cells.map((cell) => ({ ...cell, note: "A\nB\tC\nD\nE" })),
      })),
      stateLabels: {
        included: "A\nB\tC\nD\nE",
        absent: "A\nB\tC\nD\nE",
        conditional: "A\nB\tC\nD\nE",
        unknown: "A\nB\tC\nD\nE",
      },
    },
  },
];
