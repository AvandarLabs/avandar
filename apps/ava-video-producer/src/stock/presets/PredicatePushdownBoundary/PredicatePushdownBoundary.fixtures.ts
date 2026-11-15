import type { Input } from "./PredicatePushdownBoundary.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  rows: [
    {
      id: "a",
      value: 2,
    },
    {
      id: "b",
      value: 7,
    },
    {
      id: "c",
      value: 4,
    },
    {
      id: "d",
      value: 9,
    },
  ],
  predicate: {
    operator: ">=",
    threshold: 5,
  },
  metric: {
    label: "Recorded items",
    unit: "items",
    rowUnit: "records",
  },
  labels: {
    source: "Source system",
    destination: "Local query",
    condition: "Apply at source",
    retained: "Remain at source",
    transferred: "Transferred rows",
  },
  showTotals: true,
  copy: {
    context: "Fictional document",
    source: "Original",
    result: "Extracted result",
  },
};
/** Default, minimum, dense and changed-input cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: { ...DEFAULT_INPUT } },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      rows: [
        { id: "", value: -100 },
        { id: "b", value: 100 },
      ],
      showTotals: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      rows: [
        { id: "WWWWWWWWWWW0", value: -100 },
        { id: "WWWWWWWWWWW1", value: -75 },
        { id: "WWWWWWWWWWW2", value: -50 },
        { id: "WWWWWWWWWWW3", value: -25 },
        { id: "WWWWWWWWWWW4", value: 0 },
        { id: "WWWWWWWWWWW5", value: 25 },
        { id: "WWWWWWWWWWW6", value: 50 },
        { id: "WWWWWWWWWWW7", value: 75 },
      ],
      predicate: { operator: ">=", threshold: -25 },
      metric: {
        label: "WWWWWWWWWWWWWWWWWWWWWW",
        unit: "WWWWWWWWWWWWWWWWWWWWWW",
        rowUnit: "WWWWWWWWWWWWWWWWWWWWWW",
      },
      labels: {
        source: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        destination: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        condition: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        transferred: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      copy: {
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
      predicate: { operator: "<=", threshold: 4 },
      showTotals: false,
    },
  },
];
/** Strict-schema rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    rows: [
      { id: "a", value: 101 },
      { id: "b", value: 7 },
    ],
  },
  { ...DEFAULT_INPUT, predicate: { operator: ">", threshold: 5 } },
  { ...DEFAULT_INPUT, rows: [{ id: "a", value: 2 }] },
  {
    ...DEFAULT_INPUT,
    rows: [
      { id: "a", value: 2 },
      { id: "a", value: 2 },
    ],
  },
];
