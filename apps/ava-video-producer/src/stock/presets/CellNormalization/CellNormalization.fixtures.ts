import type { Input } from "./CellNormalization.schema";
/** Complete fictional fallback used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  title: "Fictional location cleanup",
  rows: [
    {
      id: "a",
      before: "  Bay A",
      after: "Bay A",
      editLabel: "Trim leading spaces",
    },
    {
      id: "b",
      before: "bay b",
      after: "Bay B",
      editLabel: "Standardize case",
    },
    {
      id: "c",
      before: "Bay C",
      after: "Bay C",
      editLabel: "Unchanged",
    },
  ],
  columnLabels: {
    original: "Original",
    result: "Prepared value",
    change: "Edit",
  },
  showWhitespace: true,
  comparison: "side-rail",
  showEditLabels: true,
};
/** Minimum, dense, changed and data-boundary cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      title: "A",
      rows: [
        {
          id: "",
          before: "",
          after: "",
          editLabel: "",
        },
        {
          id: "item-1",
          before: "",
          after: "",
          editLabel: "",
        },
      ],
      columnLabels: {
        original: "A",
        result: "A",
        change: "A",
      },
      showWhitespace: false,
      comparison: "inline-ghost",
      showEditLabels: false,
    },
  },
  {
    id: "dense",
    input: {
      title: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      rows: [
        {
          id: "item-0",
          before: "WWWWWWWWWWWWWWWWWWWWWWWW",
          after: "WWWWWWWWWWWWWWWWWWWWWWWW",
          editLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "item-1",
          before: "WWWWWWWWWWWWWWWWWWWWWWWW",
          after: "WWWWWWWWWWWWWWWWWWWWWWWW",
          editLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "item-2",
          before: "WWWWWWWWWWWWWWWWWWWWWWWW",
          after: "WWWWWWWWWWWWWWWWWWWWWWWW",
          editLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "item-3",
          before: "WWWWWWWWWWWWWWWWWWWWWWWW",
          after: "WWWWWWWWWWWWWWWWWWWWWWWW",
          editLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "item-4",
          before: "WWWWWWWWWWWWWWWWWWWWWWWW",
          after: "WWWWWWWWWWWWWWWWWWWWWWWW",
          editLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      columnLabels: {
        original: "WWWWWWWWWWWWWWWWWWWWWW",
        result: "WWWWWWWWWWWWWWWWWWWWWW",
        change: "WWWWWWWWWWWWWWWWWWWWWW",
      },
      showWhitespace: true,
      comparison: "side-rail",
      showEditLabels: true,
    },
  },
  {
    id: "changed",
    input: {
      title: "Fictional count and percent review",
      rows: [
        {
          id: "composite",
          before: "12 (40)",
          after: "12 (40)",
          editLabel: "Count and percent unchanged",
        },
        {
          id: "minus",
          before: "−1,200",
          after: "-1200",
          editLabel: "Authored symbol cleanup",
        },
      ],
      columnLabels: {
        original: "Original",
        result: "Prepared value",
        change: "Edit",
      },
      showWhitespace: true,
      comparison: "side-rail",
      showEditLabels: true,
    },
  },
  {
    id: "whitespace",
    input: {
      title: "Fictional location cleanup",
      rows: [
        {
          id: "spaces",
          before: "  A  B  ",
          after: "A B",
          editLabel: "Explicit trim",
        },
        {
          id: "breaks",
          before: "A\tB\nC",
          after: "A\tB\nC",
          editLabel: "Unchanged",
        },
        {
          id: "blank",
          before: "",
          after: "",
          editLabel: "",
        },
      ],
      columnLabels: {
        original: "Original",
        result: "Prepared value",
        change: "Edit",
      },
      showWhitespace: true,
      comparison: "side-rail",
      showEditLabels: true,
    },
  },
];
/** Explicit malformed documents rejected by the strict runtime schema. */
export const invalidInputs: unknown[] = [
  {
    ...DEFAULT_INPUT,
    rows: [
      { ...DEFAULT_INPUT.rows[0], id: "" },
      { ...DEFAULT_INPUT.rows[1], id: "" },
    ],
  },
  {},
  { ...DEFAULT_INPUT, unexpected: true },
  { ...DEFAULT_INPUT, rows: [] },
  { ...DEFAULT_INPUT, rows: [DEFAULT_INPUT.rows[0], DEFAULT_INPUT.rows[0]] },
  {
    ...DEFAULT_INPUT,
    rows: [
      { ...DEFAULT_INPUT.rows[0], unexpected: true },
      ...DEFAULT_INPUT.rows.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    rows: [
      { ...DEFAULT_INPUT.rows[0], id: "X".repeat(50) },
      ...DEFAULT_INPUT.rows.slice(1),
    ],
  },
  { ...DEFAULT_INPUT, title: "X".repeat(47) },
  {
    ...DEFAULT_INPUT,
    rows: [
      { ...DEFAULT_INPUT.rows[0], before: "X".repeat(25) },
      DEFAULT_INPUT.rows[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    columnLabels: { ...DEFAULT_INPUT.columnLabels, unexpected: true },
  },
  { ...DEFAULT_INPUT, comparison: "unknown" },
];
