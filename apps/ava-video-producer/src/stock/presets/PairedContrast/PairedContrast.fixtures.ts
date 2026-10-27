import type { Input } from "./PairedContrast.schema";
/** Complete fictional content used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  question: "How is a fictional draft reviewed?",
  alternatives: [
    {
      id: "solo",
      label: "Solo review",
    },
    {
      id: "pair",
      label: "Pair review",
    },
  ],
  criteria: [
    {
      id: "reader",
      label: "Reader",
      leftText: "One author",
      rightText: "Two collaborators",
    },
    {
      id: "handoff",
      label: "Handoff",
      leftText: "One self-check",
      rightText: "A shared discussion",
    },
  ],
  focusCriterionId: "handoff",
  comparisonLabel: "Same task, different review",
  showPairBrackets: true,
};
/** Collection and accepted text-boundary cases for reproducible review. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      question: "Q",
      alternatives: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      criteria: [{ id: "c", label: "", leftText: "", rightText: "" }],
      focusCriterionId: "c",
      comparisonLabel: "",
      showPairBrackets: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      question: "界".repeat(60),
      alternatives: DEFAULT_INPUT.alternatives.map((item) => ({
        ...item,
        label: "界".repeat(24),
      })),
      criteria: Array.from({ length: 3 }, (_, index) => ({
        id: `criterion-${index}`,
        label: "界".repeat(20),
        leftText: "界".repeat(34),
        rightText: "界".repeat(34),
      })),
      focusCriterionId: "criterion-2",
      comparisonLabel: "界".repeat(48),
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      question: "Who operates this fictional service?",
      focusCriterionId: "reader",
      showPairBrackets: false,
    },
  },
];
/** Rejection fixtures exercise strict keys and authored references. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, focusCriterionId: "missing" },
  {
    ...DEFAULT_INPUT,
    alternatives: [
      DEFAULT_INPUT.alternatives[0],
      DEFAULT_INPUT.alternatives[0],
    ],
  },
  {
    ...DEFAULT_INPUT,
    criteria: [DEFAULT_INPUT.criteria[0], DEFAULT_INPUT.criteria[0]],
  },
  {
    ...DEFAULT_INPUT,
    criteria: [{ ...DEFAULT_INPUT.criteria[0], extra: true }],
  },
];

const _wideWords = (...lengths: number[]): string =>
  lengths.map((length) => "界".repeat(length)).join(" ");
/**
 * Accepted word-packing and whitespace cases preserve original authored values.
 */
export const textRegressionInputs: Array<{
  id: string;
  input: Input;
  text: string;
}> = [
  {
    id: "alternative-spaced",
    text: _wideWords(8, 8, 6),
    input: {
      ...DEFAULT_INPUT,
      alternatives: [
        { ...DEFAULT_INPUT.alternatives[0], label: _wideWords(8, 8, 6) },
        DEFAULT_INPUT.alternatives[1],
      ],
    },
  },
  {
    id: "attribute-spaced",
    text: _wideWords(8, 8, 8, 7),
    input: {
      ...DEFAULT_INPUT,
      criteria: [
        { ...DEFAULT_INPUT.criteria[0], leftText: _wideWords(8, 8, 8, 7) },
        DEFAULT_INPUT.criteria[1],
      ],
    },
  },
  {
    id: "criterion-four-lines",
    text: _wideWords(5, 5, 5, 2),
    input: {
      ...DEFAULT_INPUT,
      criteria: [
        { ...DEFAULT_INPUT.criteria[0], label: _wideWords(5, 5, 5, 2) },
        DEFAULT_INPUT.criteria[1],
      ],
    },
  },
  {
    id: "question-breaks",
    text: "A\nB\nC\nD",
    input: { ...DEFAULT_INPUT, question: "A\nB\nC\nD" },
  },
  {
    id: "all-label-breaks",
    text: "A\nB\tC\nD\nE",
    input: {
      ...DEFAULT_INPUT,
      question: "A\nB\tC\nD\nE",
      alternatives: DEFAULT_INPUT.alternatives.map((item) => ({
        ...item,
        label: "A\nB\tC\nD\nE",
      })),
      criteria: DEFAULT_INPUT.criteria.map((item) => ({
        ...item,
        label: "A\nB\tC\nD\nE",
        leftText: "A\nB\tC\nD\nE",
        rightText: "A\nB\tC\nD\nE",
      })),
      comparisonLabel: "A\nB\tC\nD\nE",
    },
  },
];
