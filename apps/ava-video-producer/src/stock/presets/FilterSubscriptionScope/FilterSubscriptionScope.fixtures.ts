import type { Input } from "./FilterSubscriptionScope.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  records: [
    {
      id: "a",
      category: "West",
      value: 2,
    },
    {
      id: "b",
      category: "East",
      value: 5,
    },
    {
      id: "c",
      category: "West",
      value: 3,
    },
  ],
  views: [
    {
      id: "one",
      label: "Selected items",
      subscribed: true,
    },
    {
      id: "two",
      label: "Selected records",
      subscribed: true,
    },
    {
      id: "three",
      label: "All items reference",
      subscribed: false,
    },
  ],
  selectedCategory: "West",
  metric: {
    valueLabel: "Recorded items",
    valueUnit: "items",
    countUnit: "records",
  },
  showExcludedRecords: true,
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
      records: [
        { id: "", category: "West", value: 2 },
        { id: "b", category: "East", value: 5 },
      ],
      views: [
        { id: "", label: "Selected items", subscribed: true },
        { id: "three", label: "All items reference", subscribed: false },
      ],
      showExcludedRecords: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      records: [
        { id: "0", category: "EEEEEEEEEEEEEEEE", value: 0 },
        { id: "1", category: "WWWWWWWWWWWWWWWW", value: 1 },
        { id: "2", category: "EEEEEEEEEEEEEEEE", value: 2 },
        { id: "3", category: "WWWWWWWWWWWWWWWW", value: 3 },
        { id: "4", category: "EEEEEEEEEEEEEEEE", value: 4 },
        { id: "5", category: "WWWWWWWWWWWWWWWW", value: 5 },
      ],
      views: [
        { id: "one", label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW", subscribed: true },
        { id: "two", label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW", subscribed: true },
        {
          id: "three",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          subscribed: false,
        },
      ],
      selectedCategory: "WWWWWWWWWWWWWWWW",
      metric: {
        valueLabel: "WWWWWWWWWWWWWWWWWWWWWW",
        valueUnit: "WWWWWWWWWWWWWWWWWWWWWW",
        countUnit: "WWWWWWWWWWWWWWWWWWWWWW",
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
      selectedCategory: "East",
      showExcludedRecords: false,
    },
  },
];
/** Strict-schema rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, selectedCategory: "Absent" },
  { ...DEFAULT_INPUT, records: [{ id: "a", category: "West", value: 2 }] },
  {
    ...DEFAULT_INPUT,
    views: [
      { id: "one", label: "Selected items", subscribed: true },
      { id: "two", label: "Selected records", subscribed: true },
      { id: "three", label: "All items reference", subscribed: true },
    ],
  },
  {
    ...DEFAULT_INPUT,
    records: [
      { id: "WWWWWWWWWWWWW", category: "West", value: 2 },
      { id: "WWWWWWWWWWWWW", category: "East", value: 5 },
      { id: "WWWWWWWWWWWWW", category: "West", value: 3 },
    ],
  },
  {
    ...DEFAULT_INPUT,
    views: [
      { id: "WWWWWWWWWWWWW", label: "Selected items", subscribed: true },
      { id: "WWWWWWWWWWWWW", label: "Selected records", subscribed: true },
      { id: "WWWWWWWWWWWWW", label: "All items reference", subscribed: false },
    ],
  },
];
