import type { Input } from "./MinimumCountMapSuppression.schema";
/** Complete fictional default document. */
export const DEFAULT_INPUT: Input = {
  cells: [
    { id: "a", label: "Cell A", count: 2 },
    { id: "b", label: "Cell B", count: 6 },
    { id: "c", label: "Cell C", count: 0 },
    { id: "d", label: "Cell D", count: null },
  ],
  minimum: 5,
  labels: {
    local: "Local aggregates",
    public: "Released map",
    suppressed: "Below release threshold",
    missing: "No data",
    zero: "Reported zero",
  },
  showLocalCounts: true,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Complete alternate data and toggle behavior. */
export const CHANGED_INPUT: Input = {
  cells: [
    { id: "a", label: "Cell A", count: 2 },
    { id: "b", label: "Cell B", count: 6 },
    { id: "c", label: "Cell C", count: 0 },
    { id: "d", label: "Cell D", count: null },
  ],
  minimum: 7,
  labels: {
    local: "Local aggregates",
    public: "Released map",
    suppressed: "Below release threshold",
    missing: "No data",
    zero: "Reported zero",
  },
  showLocalCounts: false,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Default, minimum, dense and changed accepted documents. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      cells: [
        { id: "", label: "", count: null },
        { id: "b", label: "B", count: 0 },
        { id: "c", label: "C", count: 1 },
      ],
      minimum: 2,
      labels: {
        local: "Local aggregates",
        public: "Released map",
        suppressed: "Below release threshold",
        missing: "No data",
        zero: "Reported zero",
      },
      showLocalCounts: true,
      copy: {
        context: "Fictional schematic geography",
        before: "Supplied observations",
        after: "Derived display",
      },
    },
  },
  {
    id: "dense",
    input: {
      cells: [
        { id: "0", label: "MMMMMMMMMMMMMMMM", count: null },
        { id: "1", label: "MMMMMMMMMMMMMMMM", count: 0 },
        { id: "2", label: "MMMMMMMMMMMMMMMM", count: 4 },
        { id: "3", label: "MMMMMMMMMMMMMMMM", count: 5 },
        { id: "4", label: "MMMMMMMMMMMMMMMM", count: 6 },
        { id: "5", label: "MMMMMMMMMMMMMMMM", count: 100 },
      ],
      minimum: 5,
      labels: {
        local: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        public: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        suppressed: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        missing: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        zero: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showLocalCounts: true,
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        before: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        after: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
    },
  },
  { id: "changed", input: CHANGED_INPUT },
];
/** Structural, bound and semantic rejections. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    cells: [
      { id: "a", label: "Cell A", count: 2 },
      { id: "b", label: "Cell B", count: 6 },
      { id: "c", label: "Cell C", count: 0 },
      { id: "d", label: "Cell D", count: null },
    ],
    minimum: 5,
    labels: {
      local: "Local aggregates",
      public: "Released map",
      suppressed: "Below release threshold",
      missing: "No data",
      zero: "Reported zero",
    },
    showLocalCounts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
    extra: true,
  },
  {
    cells: [
      { id: "a", label: "Cell A", count: 2 },
      { id: "b", label: "Cell B", count: 6 },
      { id: "c", label: "Cell C", count: 0 },
      { id: "d", label: "Cell D", count: null },
    ],
    minimum: 5,
    labels: {
      local: "Local aggregates",
      public: "Released map",
      suppressed: "Below release threshold",
      missing: "No data",
      zero: "Reported zero",
    },
    showLocalCounts: true,
    copy: {
      context: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    cells: [],
    minimum: 5,
    labels: {
      local: "Local aggregates",
      public: "Released map",
      suppressed: "Below release threshold",
      missing: "No data",
      zero: "Reported zero",
    },
    showLocalCounts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    cells: [
      { id: "a", label: "Cell A", count: 2 },
      { id: "b", label: "Cell B", count: 6 },
      { id: "c", label: "Cell C", count: 0 },
      { id: "d", label: "Cell D", count: null },
      { id: "a", label: "Cell A", count: 2 },
      { id: "b", label: "Cell B", count: 6 },
      { id: "c", label: "Cell C", count: 0 },
      { id: "d", label: "Cell D", count: null },
    ],
    minimum: 5,
    labels: {
      local: "Local aggregates",
      public: "Released map",
      suppressed: "Below release threshold",
      missing: "No data",
      zero: "Reported zero",
    },
    showLocalCounts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    cells: [
      { id: "a", label: "Cell A", count: 2 },
      { id: "b", label: "Cell B", count: 6 },
      { id: "c", label: "Cell C", count: 0 },
      { id: "d", label: "Cell D", count: null },
    ],
    minimum: 1,
    labels: {
      local: "Local aggregates",
      public: "Released map",
      suppressed: "Below release threshold",
      missing: "No data",
      zero: "Reported zero",
    },
    showLocalCounts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    cells: [
      { id: "xxxxxxxxxxxxx", label: "Cell A", count: 2 },
      { id: "b", label: "Cell B", count: 6 },
      { id: "c", label: "Cell C", count: 0 },
      { id: "d", label: "Cell D", count: null },
    ],
    minimum: 5,
    labels: {
      local: "Local aggregates",
      public: "Released map",
      suppressed: "Below release threshold",
      missing: "No data",
      zero: "Reported zero",
    },
    showLocalCounts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    cells: [
      { id: "a", label: "Cell A", count: -1 },
      { id: "b", label: "Cell B", count: 6 },
      { id: "c", label: "Cell C", count: 0 },
      { id: "d", label: "Cell D", count: null },
    ],
    minimum: 5,
    labels: {
      local: "Local aggregates",
      public: "Released map",
      suppressed: "Below release threshold",
      missing: "No data",
      zero: "Reported zero",
    },
    showLocalCounts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    cells: [
      { id: "a", label: "Cell A", count: 1.5 },
      { id: "b", label: "Cell B", count: 6 },
      { id: "c", label: "Cell C", count: 0 },
      { id: "d", label: "Cell D", count: null },
    ],
    minimum: 5,
    labels: {
      local: "Local aggregates",
      public: "Released map",
      suppressed: "Below release threshold",
      missing: "No data",
      zero: "Reported zero",
    },
    showLocalCounts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
];
