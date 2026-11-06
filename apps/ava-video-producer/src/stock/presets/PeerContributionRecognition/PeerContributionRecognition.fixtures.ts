import type { Input } from "./PeerContributionRecognition.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  people: { contributor: "Rin", colleague: "Jo" },
  contributions: [
    { id: "guide", label: "Clear setup guide", artifact: "guide" },
  ],
  focusedContributionId: "guide",
  acknowledgment: { text: "Your guide made the steps clear.", form: "spoken" },
  showAuthorshipTab: true,
  exampleLabel: "Fictional peer acknowledgment",
};
/**
 * Minimum, maximum-density and changed semantics exercise authored variants.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      people: { contributor: "A", colleague: "B" },
      contributions: [{ id: "a", label: "A", artifact: "guide" }],
      focusedContributionId: "a",
      acknowledgment: { text: "Y", form: "spoken" },
      showAuthorshipTab: false,
      exampleLabel: "F",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      people: {
        contributor: "WWWWWWWWWWWWWWWWWW",
        colleague: "VVVVVVVVVVVVVVVVVV",
      },
      contributions: [
        {
          id: " xxxxxxxxxxxxxxxxxxx",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          artifact: "repair",
        },
        {
          id: "界xxxxxxxxxxxxxxxxxxx",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          artifact: "drawing",
        },
      ],
      focusedContributionId: "界xxxxxxxxxxxxxxxxxxx",
      acknowledgment: {
        ...DEFAULT_INPUT.acknowledgment,
        text: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      exampleLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      contributions: [
        DEFAULT_INPUT.contributions[0],
        { id: "drawing", label: "Assembly drawing", artifact: "drawing" },
      ],
      focusedContributionId: "drawing",
      acknowledgment: {
        text: "Your drawing clarified this joint.",
        form: "note",
      },
      showAuthorshipTab: false,
    },
  },
];
/** Rejection documents preserve all unaffected input fields. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, people: { contributor: "A", colleague: "A" } },
  { ...DEFAULT_INPUT, contributions: [] },
  {
    ...DEFAULT_INPUT,
    contributions: [
      DEFAULT_INPUT.contributions[0],
      DEFAULT_INPUT.contributions[0],
    ],
  },
  { ...DEFAULT_INPUT, focusedContributionId: "missing" },
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, extra: true } },
  { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, contributor: "" } },
  {
    ...DEFAULT_INPUT,
    people: {
      ...DEFAULT_INPUT.people,
      contributor:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, colleague: "" } },
  {
    ...DEFAULT_INPUT,
    people: {
      ...DEFAULT_INPUT.people,
      colleague:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    contributions: [{ ...DEFAULT_INPUT.contributions[0], extra: true }],
  },
  {
    ...DEFAULT_INPUT,
    contributions: [{ ...DEFAULT_INPUT.contributions[0], id: "INVALID" }],
  },
  {
    ...DEFAULT_INPUT,
    contributions: [{ ...DEFAULT_INPUT.contributions[0], label: "" }],
  },
  {
    ...DEFAULT_INPUT,
    contributions: [
      {
        ...DEFAULT_INPUT.contributions[0],
        label:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    contributions: [{ ...DEFAULT_INPUT.contributions[0], artifact: "INVALID" }],
  },
  { ...DEFAULT_INPUT, focusedContributionId: "INVALID" },
  {
    ...DEFAULT_INPUT,
    acknowledgment: { ...DEFAULT_INPUT.acknowledgment, extra: true },
  },
  {
    ...DEFAULT_INPUT,
    acknowledgment: { ...DEFAULT_INPUT.acknowledgment, text: "" },
  },
  {
    ...DEFAULT_INPUT,
    acknowledgment: {
      ...DEFAULT_INPUT.acknowledgment,
      text: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    acknowledgment: { ...DEFAULT_INPUT.acknowledgment, form: "INVALID" },
  },
  { ...DEFAULT_INPUT, showAuthorshipTab: "true" },
  { ...DEFAULT_INPUT, exampleLabel: "" },
  {
    ...DEFAULT_INPUT,
    exampleLabel:
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
];
