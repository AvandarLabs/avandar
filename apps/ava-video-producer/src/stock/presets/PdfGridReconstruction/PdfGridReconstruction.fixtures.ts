import type { Input } from "./PdfGridReconstruction.schema";
/** Complete fictional default, used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  grid: {
    columnLabels: ["Site", "Items"],
    rows: [
      ["West", "12"],
      ["East", "8"],
    ],
  },
  signal: "ruling-lines",
  evidenceLabel: "Ruling lines define the cell grid",
  showSourceLinks: true,
  copy: {
    context: "Fictional document",
    source: "Original",
    result: "Extracted result",
  },
};
/** Minimum, dense and changed inputs, including semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      grid: {
        ...DEFAULT_INPUT.grid,
        columnLabels: ["A", "B"],
        rows: [
          ["", ""],
          ["", ""],
        ],
      },
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      grid: {
        ...DEFAULT_INPUT.grid,
        columnLabels: [
          "WWWWWWWWWWWWWWWW",
          "WWWWWWWWWWWWWWWW",
          "WWWWWWWWWWWWWWWW",
          "WWWWWWWWWWWWWWWW",
        ],
        rows: [
          [
            "WWWWWWWWWWWWWWWWWW",
            "界界界界界界界界界界界界界界界界界界",
            "  \t\n A  ",
            "same",
          ],
          ["same", "", "same", "same"],
          ["MMMMMMMMMMMMMMMMMM", "ééééééééé", "👩‍🔬👩‍🔬", "same"],
          ["same", "same", "same", "same"],
        ],
      },
      signal: "whitespace",
      evidenceLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      copy: {
        ...DEFAULT_INPUT.copy,
        context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        source: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        result: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      signal: "tagged-cells",
      evidenceLabel: " Tagged cells retain source positions ",
      showSourceLinks: false,
    },
  },
];
/** Structural, reference and arithmetic rejection examples. */
export const invalidInputs: unknown[] = [
  undefined,
  null,
  {},
  {
    ...DEFAULT_INPUT,
    grid: { ...DEFAULT_INPUT.grid, columnLabels: ["A"], rows: [["a"], ["b"]] },
  },
  {
    ...DEFAULT_INPUT,
    grid: {
      ...DEFAULT_INPUT.grid,
      columnLabels: ["A", "A", "A", "A", "A"],
      rows: [
        ["a", "a", "a", "a", "a"],
        ["a", "a", "a", "a", "a"],
      ],
    },
  },
  {
    ...DEFAULT_INPUT,
    grid: {
      ...DEFAULT_INPUT.grid,
      columnLabels: ["A", "B"],
      rows: [["a", "b"]],
    },
  },
  {
    ...DEFAULT_INPUT,
    grid: {
      ...DEFAULT_INPUT.grid,
      columnLabels: ["A", "B"],
      rows: [
        ["a", "b"],
        ["a", "b"],
        ["a", "b"],
        ["a", "b"],
        ["a", "b"],
      ],
    },
  },
  {
    ...DEFAULT_INPUT,
    grid: {
      ...DEFAULT_INPUT.grid,
      columnLabels: ["A", "B"],
      rows: [["a"], ["b", "c"]],
    },
  },
  {
    ...DEFAULT_INPUT,
    grid: {
      ...DEFAULT_INPUT.grid,
      columnLabels: ["A", "B"],
      rows: [
        ["xxxxxxxxxxxxxxxxxxx", ""],
        ["", ""],
      ],
    },
  },
  {
    ...DEFAULT_INPUT,
    grid: {
      ...DEFAULT_INPUT.grid,
      columnLabels: ["", "B"],
      rows: [
        ["", ""],
        ["", ""],
      ],
    },
  },
  {
    ...DEFAULT_INPUT,
    grid: {
      ...DEFAULT_INPUT.grid,
      columnLabels: ["xxxxxxxxxxxxxxxxx", "B"],
      rows: [
        ["", ""],
        ["", ""],
      ],
    },
  },
  { ...DEFAULT_INPUT, grid: { ...DEFAULT_INPUT.grid, extra: true } },
  { ...DEFAULT_INPUT, signal: "OCR" },
  { ...DEFAULT_INPUT, evidenceLabel: "" },
  {
    ...DEFAULT_INPUT,
    evidenceLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, context: "" } },
  {
    ...DEFAULT_INPUT,
    copy: {
      ...DEFAULT_INPUT.copy,
      context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, source: "" } },
  {
    ...DEFAULT_INPUT,
    copy: {
      ...DEFAULT_INPUT.copy,
      source: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, result: "" } },
  {
    ...DEFAULT_INPUT,
    copy: {
      ...DEFAULT_INPUT.copy,
      result: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: true } },
  { ...DEFAULT_INPUT, extra: true },
];
