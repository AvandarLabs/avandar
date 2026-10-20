import type { Input } from "./SchemaPlanLocalExecution.schema";
/** Complete fictional default, used only for omitted input. */
export const DEFAULT_INPUT: Input = {
  columns: { category: "Team", measure: "Items" },
  rows: [
    { id: "a", category: "North", value: 2 },
    { id: "b", category: "South", value: 5 },
    { id: "c", category: "North", value: 3 },
  ],
  request: {
    question: "Total items for North?",
    selectedCategory: "North",
    planLabel: "Filter North, then sum Items",
  },
  boundaryLabels: {
    local: "Local device",
    remote: "Remote query planner",
    outbound: "Question + schema only",
    inbound: "Authored query plan",
    result: "Local result",
  },
  showRows: true,
  copy: { context: "Fictional example", before: "Before", after: "After" },
};
/** Default, minimum, dense and changed semantic documents. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      columns: { category: "Team", measure: "Items" },
      rows: [
        { id: "a", category: "North", value: 2 },
        { id: "b", category: "South", value: 5 },
        { id: "c", category: "North", value: 3 },
      ],
      request: {
        question: "Total items for North?",
        selectedCategory: "North",
        planLabel: "Filter North, then sum Items",
      },
      boundaryLabels: {
        local: "Local device",
        remote: "Remote query planner",
        outbound: "Question + schema only",
        inbound: "Authored query plan",
        result: "Local result",
      },
      showRows: true,
      copy: { context: "Fictional example", before: "Before", after: "After" },
    },
  },
  {
    id: "minimum",
    input: {
      columns: { category: "Team", measure: "Items" },
      rows: [
        { id: "a", category: "N", value: 0 },
        { id: "b", category: "S", value: 0 },
      ],
      request: { question: "N", selectedCategory: "N", planLabel: "P" },
      boundaryLabels: {
        local: "Local device",
        remote: "Remote query planner",
        outbound: "Question + schema only",
        inbound: "Authored query plan",
        result: "Local result",
      },
      showRows: false,
      copy: { context: "Fictional example", before: "Before", after: "After" },
    },
  },
  {
    id: "dense",
    input: {
      columns: {
        category: "WWWWWWWWWWWWWWWWWWWW",
        measure: "VVVVVVVVVVVVVVVVVVVV",
      },
      rows: [
        { id: "aaaaaaaaaaaa", category: "WWWWWWWWWWWWWWWW", value: 100 },
        {
          id: "bbbbbbbbbbbb",
          category: "VVVVVVVVVVVVVVVV",
          value: 0.12345678901234566,
        },
        { id: "cccccccccccc", category: "WWWWWWWWWWWWWWWW", value: 100 },
        {
          id: "dddddddddddd",
          category: "VVVVVVVVVVVVVVVV",
          value: 0.12345678901234566,
        },
        { id: "eeeeeeeeeeee", category: "WWWWWWWWWWWWWWWW", value: 100 },
        {
          id: "ffffffffffff",
          category: "VVVVVVVVVVVVVVVV",
          value: 0.12345678901234566,
        },
      ],
      request: {
        question: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        selectedCategory: "WWWWWWWWWWWWWWWW",
        planLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      boundaryLabels: {
        local: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        remote: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        outbound: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        inbound: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        result: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showRows: true,
      copy: {
        context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        after: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      columns: { category: "Team", measure: "Items" },
      rows: [
        { id: "a", category: "North", value: 2 },
        { id: "b", category: "North", value: 5 },
        { id: "c", category: "North", value: 3 },
      ],
      request: {
        question: "Total items for North?",
        selectedCategory: "North",
        planLabel: "Filter North, then sum Items",
      },
      boundaryLabels: {
        local: "Local device",
        remote: "Remote query planner",
        outbound: "Question + schema only",
        inbound: "Authored query plan",
        result: "Local result",
      },
      showRows: false,
      copy: { context: "Fictional example", before: "Before", after: "After" },
    },
  },
];
/** Invalid structures, bounds, and cross references. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, rows: [] },
  { ...DEFAULT_INPUT, rows: Array(7).fill(DEFAULT_INPUT.rows[0]) },
  { ...DEFAULT_INPUT, rows: [DEFAULT_INPUT.rows[0], DEFAULT_INPUT.rows[0]] },
  { ...DEFAULT_INPUT, columns: { category: "A", measure: "A" } },
  {
    ...DEFAULT_INPUT,
    request: { ...DEFAULT_INPUT.request, selectedCategory: "West" },
  },
  {
    ...DEFAULT_INPUT,
    request: { ...DEFAULT_INPUT.request, question: "Total?" },
  },
  {
    ...DEFAULT_INPUT,
    rows: [{ ...DEFAULT_INPUT.rows[0], value: -1 }, DEFAULT_INPUT.rows[1]],
  },
  {
    ...DEFAULT_INPUT,
    rows: [{ ...DEFAULT_INPUT.rows[0], value: 101 }, DEFAULT_INPUT.rows[1]],
  },
  {
    ...DEFAULT_INPUT,
    rows: [
      { ...DEFAULT_INPUT.rows[0], value: Infinity },
      DEFAULT_INPUT.rows[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    rows: [{ ...DEFAULT_INPUT.rows[0], value: NaN }, DEFAULT_INPUT.rows[1]],
  },
  { ...DEFAULT_INPUT, showRows: 1 },
  { ...DEFAULT_INPUT, columns: { ...DEFAULT_INPUT.columns, category: "" } },
  {
    ...DEFAULT_INPUT,
    columns: { ...DEFAULT_INPUT.columns, category: "W".repeat(21) },
  },
  { ...DEFAULT_INPUT, columns: { ...DEFAULT_INPUT.columns, measure: "" } },
  {
    ...DEFAULT_INPUT,
    columns: { ...DEFAULT_INPUT.columns, measure: "W".repeat(21) },
  },
  {
    ...DEFAULT_INPUT,
    rows: DEFAULT_INPUT.rows.map((item, index) =>
      index === 0 ? { ...item, id: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    rows: DEFAULT_INPUT.rows.map((item, index) =>
      index === 0 ? { ...item, id: "W".repeat(13) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    rows: DEFAULT_INPUT.rows.map((item, index) =>
      index === 0 ? { ...item, category: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    rows: DEFAULT_INPUT.rows.map((item, index) =>
      index === 0 ? { ...item, category: "W".repeat(17) } : item,
    ),
  },
  { ...DEFAULT_INPUT, request: { ...DEFAULT_INPUT.request, question: "" } },
  {
    ...DEFAULT_INPUT,
    request: { ...DEFAULT_INPUT.request, question: "W".repeat(53) },
  },
  {
    ...DEFAULT_INPUT,
    request: { ...DEFAULT_INPUT.request, selectedCategory: "" },
  },
  {
    ...DEFAULT_INPUT,
    request: { ...DEFAULT_INPUT.request, selectedCategory: "W".repeat(17) },
  },
  { ...DEFAULT_INPUT, request: { ...DEFAULT_INPUT.request, planLabel: "" } },
  {
    ...DEFAULT_INPUT,
    request: { ...DEFAULT_INPUT.request, planLabel: "W".repeat(39) },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, local: "" },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, local: "W".repeat(31) },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, remote: "" },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, remote: "W".repeat(31) },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, outbound: "" },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: {
      ...DEFAULT_INPUT.boundaryLabels,
      outbound: "W".repeat(31),
    },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, inbound: "" },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: {
      ...DEFAULT_INPUT.boundaryLabels,
      inbound: "W".repeat(31),
    },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, result: "" },
  },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, result: "W".repeat(31) },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, context: "" } },
  {
    ...DEFAULT_INPUT,
    copy: { ...DEFAULT_INPUT.copy, context: "W".repeat(39) },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, before: "" } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, before: "W".repeat(39) } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, after: "" } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, after: "W".repeat(39) } },
  { ...DEFAULT_INPUT, columns: { ...DEFAULT_INPUT.columns, extra: true } },
  {
    ...DEFAULT_INPUT,
    rows: DEFAULT_INPUT.rows.map((item, index) =>
      index === 0 ? { ...item, extra: true } : item,
    ),
  },
  { ...DEFAULT_INPUT, request: { ...DEFAULT_INPUT.request, extra: true } },
  {
    ...DEFAULT_INPUT,
    boundaryLabels: { ...DEFAULT_INPUT.boundaryLabels, extra: true },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: true } },
];
