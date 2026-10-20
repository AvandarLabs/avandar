import type { Input } from "./ExpectationOverlayCheck.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  tests: [
    {
      id: "valid",
      label: "Known ticket",
      inputLabel: "Ticket A",
      expected: "Admit",
      observed: "Admit",
    },
    {
      id: "expired",
      label: "Expired ticket",
      inputLabel: "Ticket B",
      expected: "Hold",
      observed: "Admit",
    },
  ],
  labels: {
    expected: "Expected",
    observed: "Observed",
    match: "Matches",
    mismatch: "Differs",
    untested: "Not observed",
  },
  sheetMotion: "lower",
  showInputs: true,
  showStateGlyphs: true,
  exampleLabel: "Fictional test observations",
};
/** Minimum, dense and changed authored cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      tests: [{ ...DEFAULT_INPUT.tests[0], expected: " ", observed: null }],
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      tests: [
        {
          ...DEFAULT_INPUT.tests[0],
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          inputLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          expected: "WWWWWWWWWWWWWWWWWWWW",
          observed: "WWWWWWWWWWWWWWWWWWWW",
        },
        {
          ...DEFAULT_INPUT.tests[1],
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          inputLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          expected: "WWWWWWWWWWWWWWWWWWWW",
          observed: "WWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "unobserved",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          inputLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          expected: "WWWWWWWWWWWWWWWWWWWW",
          observed: null,
        },
      ],
      labels: {
        ...DEFAULT_INPUT.labels,
        expected: "WWWWWWWWWWWWWWWWWWWWWW",
        observed: "WWWWWWWWWWWWWWWWWWWWWW",
        match: "WWWWWWWWWWWWWWWWWWWWWW",
        mismatch: "WWWWWWWWWWWWWWWWWWWWWW",
        untested: "WWWWWWWWWWWWWWWWWWWWWW",
      },
      exampleLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      tests: [
        { ...DEFAULT_INPUT.tests[0], observed: "admit" },
        DEFAULT_INPUT.tests[1],
      ],
      sheetMotion: "hinge",
      showInputs: false,
      showStateGlyphs: false,
    },
  },
];
/** Rejected complete and malformed documents. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, tests: [] },
  {
    ...DEFAULT_INPUT,
    tests: [
      DEFAULT_INPUT.tests[0],
      {
        ...DEFAULT_INPUT.tests[1],
        id: "valid",
        label: "Known ticket",
        inputLabel: "Ticket A",
        expected: "Admit",
      },
    ],
  },
  { ...DEFAULT_INPUT, tests: [{ ...DEFAULT_INPUT.tests[0], observed: "" }] },
];
