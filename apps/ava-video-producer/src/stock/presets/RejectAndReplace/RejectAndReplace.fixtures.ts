import type { Input } from "./RejectAndReplace.schema";
/** Complete fictional selection with its authored criterion. */
export const DEFAULT_INPUT: Input = {
  criterion: "The fictional workshop needs portability",
  rejected: {
    label: "Fixed easel",
    reason: "Stays in the studio",
  },
  replacement: {
    label: "Folding easel",
    reason: "Packs for the workshop",
  },
  decisionLabels: {
    rejected: "Set aside",
    selected: "Selected",
  },
  showCriterionLink: true,
  rejectionMark: "strike",
};
/**
 * Text boundaries and independent visual toggles retain their authored
 * meanings.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      criterion: "C",
      rejected: { label: "A", reason: "R" },
      replacement: { label: "B", reason: "S" },
      decisionLabels: { rejected: "R", selected: "S" },
      showCriterionLink: false,
      rejectionMark: "cross",
    },
  },
  {
    id: "dense",
    input: {
      criterion: "界".repeat(58),
      rejected: { label: "界".repeat(24), reason: "界".repeat(42) },
      replacement: { label: "界".repeat(24), reason: "界".repeat(42) },
      decisionLabels: { rejected: "界".repeat(16), selected: "界".repeat(16) },
      showCriterionLink: true,
      rejectionMark: "cross",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      replacement: {
        label: "Travel drawing board",
        reason: "Folds into the travel case",
      },
      rejectionMark: "cross",
      showCriterionLink: false,
    },
  },
];
/** Invalid authored documents never silently inherit omitted content. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, rejected: { ...DEFAULT_INPUT.rejected, extra: true } },
  { ...DEFAULT_INPUT, replacement: { label: "B" } },
  { ...DEFAULT_INPUT, rejectionMark: "none" },
  { ...DEFAULT_INPUT, criterion: "C".repeat(59) },
  { ...DEFAULT_INPUT, rejected: { label: "L".repeat(25), reason: "R" } },
  { ...DEFAULT_INPUT, replacement: { label: "B", reason: "R".repeat(43) } },
];

const _spacedReason: string = Array.from({ length: 5 }, () =>
  "界".repeat(7),
).join(" ");
/** Both rationale positions retain accepted spaced words and hard breaks. */
export const textRegressionInputs: Array<{
  id: string;
  input: Input;
  text: string;
}> = [
  ...(["rejected", "replacement"] as const).map((field) => ({
    id: `${field}-spaced`,
    text: _spacedReason,
    input: {
      ...DEFAULT_INPUT,
      [field]: { ...DEFAULT_INPUT[field], reason: _spacedReason },
    },
  })),
  {
    id: "all-label-breaks",
    text: "A\nB\tC\nD\nE",
    input: {
      ...DEFAULT_INPUT,
      criterion: "A\nB\tC\nD\nE",
      rejected: { label: "A\nB\tC\nD\nE", reason: "A\nB\tC\nD\nE" },
      replacement: { label: "A\nB\tC\nD\nE", reason: "A\nB\tC\nD\nE" },
      decisionLabels: { rejected: "A\nB\tC\nD\nE", selected: "A\nB\tC\nD\nE" },
    },
  },
];
