import type { Input } from "./LateTypeEvidence.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  values: ["12", "8", "4", "Pending"],
  policy: "widen-to-text",
  labels: {
    column: "Fictional item value",
    provisional: "Provisional numeric type",
    text: "Text preserves every cell",
    review: "Import held for review",
    rows: "All source rows",
  },
  showOriginalStrings: true,
  copy: {
    context: "Fictional schematic example",
    source: "Supplied data",
    result: "Derived illustration",
  },
};
/** Alternate input and toggles. */
export const CHANGED_INPUT: Input = {
  values: ["-12", "00.80", "0", "Awaiting"],
  policy: "hold-for-review",
  labels: {
    column: "Fictional item value",
    provisional: "Provisional numeric type",
    text: "Text preserves every cell",
    review: "Import held for review",
    rows: "All source rows",
  },
  showOriginalStrings: false,
  copy: {
    context: "Fictional schematic example",
    source: "Supplied data",
    result: "Derived illustration",
  },
};
/** Default, minimum, dense and changed documents. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      values: ["-0", "0", "X"],
      policy: "widen-to-text",
      labels: {
        column: "Fictional item value",
        provisional: "Provisional numeric type",
        text: "Text preserves every cell",
        review: "Import held for review",
        rows: "All source rows",
      },
      showOriginalStrings: true,
      copy: {
        context: "Fictional schematic example",
        source: "Supplied data",
        result: "Derived illustration",
      },
    },
  },
  {
    id: "dense",
    input: {
      values: ["-12.000", "+0", ".5", "12.", "0004", "MMMMMMMMMMMMMMMM"],
      policy: "widen-to-text",
      labels: {
        column: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        provisional: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        text: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        review: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        rows: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showOriginalStrings: true,
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        source: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        result: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
    },
  },
  { id: "changed", input: CHANGED_INPUT },
];
/** Structural and semantic rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, values: ["1", "X"] },
  { ...DEFAULT_INPUT, values: ["1", "2", "3"] },
  { ...DEFAULT_INPUT, values: ["a", "2", "Pending"] },
  { ...DEFAULT_INPUT, values: ["1e2", "2", "Pending"] },
  { ...DEFAULT_INPUT, values: ["1", "2", "x".repeat(17)] },
  { ...DEFAULT_INPUT, values: [" ", "2", "Pending"] },
];
