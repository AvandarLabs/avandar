import type { Input } from "./PdfNearestLabelReview.schema";
/** Complete fictional default, used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  figure: {
    text: "24",
    x: 50,
    y: 50,
  },
  labels: [
    {
      id: "west",
      text: "West area",
      x: 35,
      y: 48,
    },
    {
      id: "east",
      text: "East area",
      x: 65,
      y: 54,
    },
  ],
  ambiguityThreshold: 0.8,
  reviewedLabelId: "west",
  showDistanceValues: true,
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
      figure: { ...DEFAULT_INPUT.figure, text: "1" },
      labels: [
        { ...DEFAULT_INPUT.labels[0], id: "", text: "A", x: 5, y: 5 },
        { ...DEFAULT_INPUT.labels[1], id: "a", text: "B", x: 95, y: 95 },
      ],
      reviewedLabelId: null,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      figure: { ...DEFAULT_INPUT.figure, text: "WWWWWWWWWWWW", x: 95, y: 95 },
      labels: [
        {
          ...DEFAULT_INPUT.labels[0],
          id: "WWWWWWWWWWWW",
          text: "WWWWWWWWWWWWWWWWWWWW",
          x: 95,
          y: 94.999999,
        },
        {
          ...DEFAULT_INPUT.labels[1],
          id: "MMMMMMMMMMMM",
          text: "MMMMMMMMMMMMMMMMMMMM",
          x: 95,
          y: 94.999999,
        },
      ],
      reviewedLabelId: "MMMMMMMMMMMM",
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
      figure: { ...DEFAULT_INPUT.figure, text: " 24\t" },
      reviewedLabelId: "east",
      showDistanceValues: false,
    },
  },
  { id: "unresolved", input: { ...DEFAULT_INPUT, reviewedLabelId: null } },
];
/** Structural, reference and arithmetic rejection examples. */
export const invalidInputs: unknown[] = [
  undefined,
  null,
  {},
  { ...DEFAULT_INPUT, labels: [] },
  { ...DEFAULT_INPUT, labels: [DEFAULT_INPUT.labels[0]] },
  {
    ...DEFAULT_INPUT,
    labels: [
      DEFAULT_INPUT.labels[0],
      DEFAULT_INPUT.labels[1],
      { id: "west", text: "West area", x: 35, y: 48 },
    ],
  },
  {
    ...DEFAULT_INPUT,
    labels: [
      DEFAULT_INPUT.labels[0],
      {
        ...DEFAULT_INPUT.labels[1],
        id: "west",
        text: "West area",
        x: 35,
        y: 48,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    labels: [
      { ...DEFAULT_INPUT.labels[0], x: 50, y: 50 },
      DEFAULT_INPUT.labels[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    labels: [
      { ...DEFAULT_INPUT.labels[0], id: "xxxxxxxxxxxxx" },
      DEFAULT_INPUT.labels[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    labels: [{ ...DEFAULT_INPUT.labels[0], text: "" }, DEFAULT_INPUT.labels[1]],
  },
  {
    ...DEFAULT_INPUT,
    labels: [
      { ...DEFAULT_INPUT.labels[0], text: "xxxxxxxxxxxxxxxxxxxxx" },
      DEFAULT_INPUT.labels[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    labels: [{ ...DEFAULT_INPUT.labels[0], x: 4 }, DEFAULT_INPUT.labels[1]],
  },
  {
    ...DEFAULT_INPUT,
    labels: [{ ...DEFAULT_INPUT.labels[0], x: 96 }, DEFAULT_INPUT.labels[1]],
  },
  {
    ...DEFAULT_INPUT,
    labels: [{ ...DEFAULT_INPUT.labels[0], y: 4 }, DEFAULT_INPUT.labels[1]],
  },
  {
    ...DEFAULT_INPUT,
    labels: [{ ...DEFAULT_INPUT.labels[0], y: 96 }, DEFAULT_INPUT.labels[1]],
  },
  { ...DEFAULT_INPUT, figure: { ...DEFAULT_INPUT.figure, text: "" } },
  {
    ...DEFAULT_INPUT,
    figure: { ...DEFAULT_INPUT.figure, text: "xxxxxxxxxxxxx" },
  },
  { ...DEFAULT_INPUT, figure: { ...DEFAULT_INPUT.figure, x: 4 } },
  { ...DEFAULT_INPUT, figure: { ...DEFAULT_INPUT.figure, x: 96 } },
  { ...DEFAULT_INPUT, figure: { ...DEFAULT_INPUT.figure, y: 4 } },
  { ...DEFAULT_INPUT, figure: { ...DEFAULT_INPUT.figure, y: 96 } },
  { ...DEFAULT_INPUT, ambiguityThreshold: 0.49 },
  { ...DEFAULT_INPUT, ambiguityThreshold: 1.01 },
  { ...DEFAULT_INPUT, reviewedLabelId: "missing" },
  {
    ...DEFAULT_INPUT,
    labels: [
      { ...DEFAULT_INPUT.labels[0], extra: true },
      DEFAULT_INPUT.labels[1],
    ],
  },
  { ...DEFAULT_INPUT, figure: { ...DEFAULT_INPUT.figure, extra: true } },
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
