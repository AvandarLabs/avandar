import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./WideTableToObservations.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  measures: [
    {
      id: "received",
      label: "Received",
      unit: "crates",
    },
    {
      id: "used",
      label: "Used",
      unit: "crates",
    },
  ],
  subjects: [
    {
      id: "a",
      label: "Site A",
      values: [
        {
          measureId: "received",
          value: 12,
        },
        {
          measureId: "used",
          value: 8,
        },
      ],
    },
    {
      id: "b",
      label: "Site B",
      values: [
        {
          measureId: "received",
          value: 5,
        },
        {
          measureId: "used",
          value: null,
        },
      ],
    },
  ],
  missingPolicy: "retain-missing-row",
  showSourceGuides: true,
  copy: {
    context: "Fictional document",
    source: "Original",
    result: "Extracted result",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  measures: [
    { id: "", label: "x", unit: "u" },
    { id: "b", label: "y", unit: "v" },
  ],
  subjects: [
    {
      id: "",
      label: "Same",
      values: [
        { measureId: "b", value: null },
        { measureId: "", value: null },
      ],
    },
    {
      id: "b",
      label: "Same",
      values: [
        { measureId: "", value: null },
        { measureId: "b", value: null },
      ],
    },
  ],
  missingPolicy: "omit-with-ledger",
  showSourceGuides: false,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  measures: [
    { id: "a".repeat(12), label: "W".repeat(18), unit: "W".repeat(12) },
    { id: "b".repeat(12), label: "W".repeat(18), unit: "X".repeat(12) },
  ],
  subjects: ["a", "b"].map((id) => ({
    id: id.repeat(12),
    label: "W".repeat(18),
    values: [
      { measureId: "b".repeat(12), value: -10000 },
      { measureId: "a".repeat(12), value: 10000 },
    ],
  })),
  copy: {
    context: "W".repeat(34),
    source: "W".repeat(34),
    result: "W".repeat(34),
  },
};
const changed: Input = {
  ...DEFAULT_INPUT,
  subjects: DEFAULT_INPUT.subjects.map((s) => ({
    ...s,
    values: [...s.values].reverse(),
  })),
  missingPolicy: "omit-with-ledger",
  showSourceGuides: false,
};
/**
 * Complete examples cover no output rows and reversed keyed measurement arrays.
 */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
];
/**
 * Rejected duplicates, missing references, nonfinite values and ID overflow.
 */
export const invalidInputs: unknown[] = [
  undefined,
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, measures: [] },
  {
    ...DEFAULT_INPUT,
    subjects: [DEFAULT_INPUT.subjects[0], DEFAULT_INPUT.subjects[0]],
  },
  {
    ...DEFAULT_INPUT,
    subjects: DEFAULT_INPUT.subjects.map((s) => ({ ...s, values: [] })),
  },
  ...[NaN, Infinity, -10001, 10001].map((value) => ({
    ...DEFAULT_INPUT,
    subjects: DEFAULT_INPUT.subjects.map((s) => ({
      ...s,
      values: s.values.map((v) => ({ ...v, value })),
    })),
  })),
  {
    ...DEFAULT_INPUT,
    subjects: DEFAULT_INPUT.subjects.map((s) => ({ ...s, id: "x".repeat(13) })),
  },
  {
    ...DEFAULT_INPUT,
    subjects: DEFAULT_INPUT.subjects.map((s) => ({
      ...s,
      values: [{ measureId: "ghost", value: 0 }, s.values[1]],
    })),
  },
];
