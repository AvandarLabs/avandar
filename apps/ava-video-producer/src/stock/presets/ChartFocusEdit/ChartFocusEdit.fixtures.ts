import type { Input } from "./ChartFocusEdit.schema";
/** Complete fictional fallback used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  categories: [
    {
      id: "paper",
      label: "Paper",
      value: 4,
    },
    {
      id: "ink",
      label: "Ink",
      value: 7,
    },
    {
      id: "labels",
      label: "Labels",
      value: 5,
    },
  ],
  axisMaximum: 10,
  unitLabel: "sample units",
  focusId: "ink",
  treatment: "both",
  headings: {
    title: "Fictional supply counts",
    before: "Initial presentation",
    after: "Refined presentation",
  },
  showValueLabels: true,
  showBeforeGuide: false,
};
/** Minimum, dense, changed and data-boundary cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      categories: [
        {
          id: "",
          label: "",
          value: 4,
        },
        {
          id: "item-1",
          label: "",
          value: 7,
        },
      ],
      axisMaximum: 10,
      unitLabel: "A",
      focusId: null,
      treatment: "direct-labels",
      headings: {
        title: "A",
        before: "A",
        after: "A",
      },
      showValueLabels: false,
      showBeforeGuide: true,
    },
  },
  {
    id: "dense",
    input: {
      categories: [
        {
          id: "item-0",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          value: 4,
        },
        {
          id: "item-1",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          value: 7,
        },
        {
          id: "item-2",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          value: 5,
        },
        {
          id: "item-3",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          value: 4,
        },
        {
          id: "item-4",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          value: 7,
        },
      ],
      axisMaximum: 10,
      unitLabel: "WWWWWWWWWWWWWWWWWWWW",
      focusId: "item-1",
      treatment: "both",
      headings: {
        title: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        after: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showValueLabels: true,
      showBeforeGuide: false,
    },
  },
  {
    id: "changed",
    input: {
      categories: [
        {
          id: "paper",
          label: "Paper",
          value: 4,
        },
        {
          id: "ink",
          label: "Ink",
          value: 7,
        },
        {
          id: "labels",
          label: "Labels",
          value: 5,
        },
      ],
      axisMaximum: 10,
      unitLabel: "sample units",
      focusId: "labels",
      treatment: "focus",
      headings: {
        title: "Fictional supply counts",
        before: "Initial presentation",
        after: "Refined presentation",
      },
      showValueLabels: true,
      showBeforeGuide: true,
    },
  },
];
/** Explicit malformed documents rejected by the strict runtime schema. */
export const invalidInputs: unknown[] = [
  {
    ...DEFAULT_INPUT,
    categories: [
      { ...DEFAULT_INPUT.categories[0], id: "" },
      { ...DEFAULT_INPUT.categories[1], id: "" },
    ],
  },
  {},
  { ...DEFAULT_INPUT, unexpected: true },
  { ...DEFAULT_INPUT, categories: [] },
  {
    ...DEFAULT_INPUT,
    categories: [DEFAULT_INPUT.categories[0], DEFAULT_INPUT.categories[0]],
  },
  {
    ...DEFAULT_INPUT,
    categories: [
      { ...DEFAULT_INPUT.categories[0], unexpected: true },
      ...DEFAULT_INPUT.categories.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    categories: [
      { ...DEFAULT_INPUT.categories[0], id: "X".repeat(50) },
      ...DEFAULT_INPUT.categories.slice(1),
    ],
  },
  { ...DEFAULT_INPUT, axisMaximum: 0 },
  { ...DEFAULT_INPUT, axisMaximum: Infinity },
  { ...DEFAULT_INPUT, axisMaximum: 1 },
  { ...DEFAULT_INPUT, focusId: "missing" },
  { ...DEFAULT_INPUT, focusId: null },
  {
    ...DEFAULT_INPUT,
    categories: [
      { ...DEFAULT_INPUT.categories[0], value: NaN },
      DEFAULT_INPUT.categories[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    categories: [
      { ...DEFAULT_INPUT.categories[0], value: -1 },
      DEFAULT_INPUT.categories[1],
    ],
  },
  { ...DEFAULT_INPUT, treatment: "unknown" },
];
