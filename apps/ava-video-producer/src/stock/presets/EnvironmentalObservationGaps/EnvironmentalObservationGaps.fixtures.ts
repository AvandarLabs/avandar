import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./EnvironmentalObservationGaps.schema";
/** Complete fictional inputs for the bounded stock animation. */
export const DEFAULT_INPUT: Input = {
  cells: [
    {
      id: "a",
      label: "Cell A",
      column: 0,
      row: 0,
      value: 28,
    },
    {
      id: "b",
      label: "Cell B",
      column: 1,
      row: 0,
      value: null,
    },
    {
      id: "c",
      label: "Cell C",
      column: 2,
      row: 0,
      value: 29,
    },
    {
      id: "d",
      label: "Cell D",
      column: 0,
      row: 1,
      value: 27,
    },
    {
      id: "e",
      label: "Cell E",
      column: 1,
      row: 1,
      value: null,
    },
    {
      id: "f",
      label: "Cell F",
      column: 2,
      row: 1,
      value: 30,
    },
  ],
  metric: {
    label: "Surface temperature",
    unit: "deg C",
    minimum: 20,
    maximum: 35,
    cellAreaHa: 1,
    periodLabel: "Fictional observation window",
  },
  fieldChecks: [
    {
      id: "visit",
      label: "Point check",
      cellId: "b",
      value: 28,
    },
  ],
  decision: {
    actorLabel: "Field monitoring team",
    actionLabel: "Inspect the missing area",
  },
  context: "globe-and-schematic-tile",
  showCoverageTotals: true,
  copy: {
    map: "Schematic local observation tile",
    observed: "Area with cell readings",
    missing: "Missing area readings",
    fieldCheck: "Field check",
    pointSupport: "Point support only",
    areaUnit: "ha",
    disclaimer: "Fictional readings and geography",
  },
};
/** Invalid authored documents are rejected instead of silently repaired. */
export const invalidInputs: unknown[] = [{}, { ...DEFAULT_INPUT, extra: true }];
/** Changed input independently exercises the central semantic invariant. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  fieldChecks: [
    { id: "one", label: "Point one", cellId: "b", value: 26 },
    { id: "two", label: "Point two", cellId: "b", value: 29 },
    { id: "three", label: "Point three", cellId: "b", value: 30 },
  ],
};
invalidInputs.push(
  {
    ...DEFAULT_INPUT,
    fieldChecks: [{ id: "one", label: "Point", cellId: "missing", value: 25 }],
  },
  {
    ...DEFAULT_INPUT,
    cells: DEFAULT_INPUT.cells.map((cell, index) =>
      index === 1 ? { ...cell, column: 0 } : cell,
    ),
  },
  { ...DEFAULT_INPUT, metric: { ...DEFAULT_INPUT.metric, maximum: 20 } },
);
const minimum: Input = {
  ...DEFAULT_INPUT,
  cells: Array.from({ length: 4 }, (_, index) => ({
    id: index ? `cell ${index}` : "",
    label: "",
    row: 2,
    column: index,
    value: null,
  })),
  fieldChecks: [],
  context: "schematic-tile",
  showCoverageTotals: false,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  cells: Array.from({ length: 12 }, (_, index) => ({
    id: index ? `cell ${index} 空` : "",
    label: "界".repeat(16),
    row: Math.floor(index / 4),
    column: index % 4,
    value: index % 3 ? null : 1e308,
  })),
  metric: {
    label: "界".repeat(26),
    unit: "界".repeat(12),
    minimum: -1e308,
    maximum: 1e308,
    cellAreaHa: 0.3,
    periodLabel: "界".repeat(38),
  },
  fieldChecks: Array.from({ length: 3 }, (_, index) => ({
    id: index ? `check ${index}` : "",
    label: "界".repeat(22),
    cellId: "cell 1 空",
    value: index ? 0 : -1e308,
  })),
  decision: { actorLabel: "界".repeat(32), actionLabel: "界".repeat(32) },
  copy: {
    map: "界".repeat(34),
    observed: "界".repeat(34),
    missing: "界".repeat(34),
    fieldCheck: "界".repeat(34),
    pointSupport: "界".repeat(34),
    areaUnit: "界".repeat(8),
    disclaimer: "界".repeat(48),
  },
};
const shifted: Input = {
  ...DEFAULT_INPUT,
  cells: Array.from({ length: 4 }, (_, index) => ({
    id: index ? `shift ${index}` : "",
    label: `Cell ${index}`,
    row: 1 + Math.floor(index / 2),
    column: 2 + (index % 2),
    value: null,
  })),
  fieldChecks: [{ id: "", label: "Empty ID point", cellId: "", value: 24 }],
};
/** Point concentration and shifted rectangles retain their actual supports. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changedInput },
  { id: "offset-rectangle", input: shifted },
  {
    id: "separated-checks",
    input: {
      ...dense,
      fieldChecks: dense.fieldChecks.map((check, index) => ({
        ...check,
        cellId: dense.cells[index * 5].id,
      })),
    },
  },
];
invalidInputs.push(
  { ...DEFAULT_INPUT, cells: DEFAULT_INPUT.cells.slice(1) },
  {
    ...DEFAULT_INPUT,
    cells: DEFAULT_INPUT.cells.map((cell) => ({ ...cell, id: "" })),
  },
  {
    ...DEFAULT_INPUT,
    fieldChecks: [{ id: "x", label: "x", cellId: "a", value: 36 }],
  },
  { ...DEFAULT_INPUT, metric: { ...DEFAULT_INPUT.metric, minimum: -Infinity } },
);
