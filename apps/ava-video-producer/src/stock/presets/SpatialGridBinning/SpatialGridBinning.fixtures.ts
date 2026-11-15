import type { Input } from "./SpatialGridBinning.schema";
/** Complete fictional default document. */
export const DEFAULT_INPUT: Input = {
  points: [
    { id: "a", x: 20, y: 20 },
    { id: "b", x: 35, y: 25 },
    { id: "c", x: 75, y: 25 },
    { id: "d", x: 80, y: 80 },
  ],
  grid: { columns: 2, rows: 2 },
  labels: {
    unit: "records per cell",
    zero: "0 observed records",
    total: "Supplied records",
  },
  showPointGhosts: true,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Complete alternate data and toggle behavior. */
export const CHANGED_INPUT: Input = {
  points: [
    { id: "", x: 0, y: 0 },
    { id: "a b", x: 50, y: 50 },
    { id: "界", x: 100, y: 100 },
  ],
  grid: { columns: 2, rows: 2 },
  labels: {
    unit: "records per cell",
    zero: "0 observed records",
    total: "Supplied records",
  },
  showPointGhosts: false,
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
      points: [{ id: "", x: 100, y: 100 }],
      grid: { columns: 2, rows: 2 },
      labels: {
        unit: "records per cell",
        zero: "0 observed records",
        total: "Supplied records",
      },
      showPointGhosts: true,
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
      points: [
        { id: "0", x: 20, y: 20 },
        { id: "1", x: 20, y: 20 },
        { id: "2", x: 20, y: 20 },
        { id: "3", x: 20, y: 20 },
        { id: "4", x: 20, y: 20 },
        { id: "5", x: 20, y: 20 },
        { id: "6", x: 20, y: 20 },
        { id: "7", x: 20, y: 20 },
        { id: "8", x: 20, y: 20 },
        { id: "9", x: 20, y: 20 },
        { id: "10", x: 20, y: 20 },
        { id: "11", x: 20, y: 20 },
      ],
      grid: { columns: 3, rows: 3 },
      labels: {
        unit: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        zero: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        total: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showPointGhosts: true,
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
    points: [
      { id: "a", x: 20, y: 20 },
      { id: "b", x: 35, y: 25 },
      { id: "c", x: 75, y: 25 },
      { id: "d", x: 80, y: 80 },
    ],
    grid: { columns: 2, rows: 2 },
    labels: {
      unit: "records per cell",
      zero: "0 observed records",
      total: "Supplied records",
    },
    showPointGhosts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
    extra: true,
  },
  {
    points: [
      { id: "a", x: 20, y: 20 },
      { id: "b", x: 35, y: 25 },
      { id: "c", x: 75, y: 25 },
      { id: "d", x: 80, y: 80 },
    ],
    grid: { columns: 2, rows: 2 },
    labels: {
      unit: "records per cell",
      zero: "0 observed records",
      total: "Supplied records",
    },
    showPointGhosts: true,
    copy: {
      context: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    points: [],
    grid: { columns: 2, rows: 2 },
    labels: {
      unit: "records per cell",
      zero: "0 observed records",
      total: "Supplied records",
    },
    showPointGhosts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    points: [
      { id: "a", x: 20, y: 20 },
      { id: "b", x: 35, y: 25 },
      { id: "c", x: 75, y: 25 },
      { id: "d", x: 80, y: 80 },
      { id: "a", x: 20, y: 20 },
      { id: "b", x: 35, y: 25 },
      { id: "c", x: 75, y: 25 },
      { id: "d", x: 80, y: 80 },
    ],
    grid: { columns: 2, rows: 2 },
    labels: {
      unit: "records per cell",
      zero: "0 observed records",
      total: "Supplied records",
    },
    showPointGhosts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    points: [
      { id: "a", x: 20, y: 20 },
      { id: "b", x: 35, y: 25 },
      { id: "c", x: 75, y: 25 },
      { id: "d", x: 80, y: 80 },
    ],
    grid: { rows: 3, columns: 2 },
    labels: {
      unit: "records per cell",
      zero: "0 observed records",
      total: "Supplied records",
    },
    showPointGhosts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    points: [{ id: "xxxxxxxxxxxxx", x: 0, y: 0 }],
    grid: { columns: 2, rows: 2 },
    labels: {
      unit: "records per cell",
      zero: "0 observed records",
      total: "Supplied records",
    },
    showPointGhosts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    points: [{ id: "", x: 101, y: 0 }],
    grid: { columns: 2, rows: 2 },
    labels: {
      unit: "records per cell",
      zero: "0 observed records",
      total: "Supplied records",
    },
    showPointGhosts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    points: [
      { id: "a", x: 20, y: 20 },
      { id: "b", x: 35, y: 25 },
      { id: "c", x: 75, y: 25 },
      { id: "d", x: 80, y: 80 },
    ],
    grid: { rows: 4, columns: 4 },
    labels: {
      unit: "records per cell",
      zero: "0 observed records",
      total: "Supplied records",
    },
    showPointGhosts: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
];
