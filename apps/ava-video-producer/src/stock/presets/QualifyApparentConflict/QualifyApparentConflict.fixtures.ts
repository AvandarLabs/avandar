import type { Input } from "./QualifyApparentConflict.schema";
/** Complete fictional content, used only for an omitted entire input. */
export const DEFAULT_INPUT: Input = {
  statements: [
    {
      id: "draft",
      claim: "Keep the marks loose",
      context: "Early fictional sketch",
    },
    {
      id: "final",
      claim: "Make the edges precise",
      context: "Final fictional diagram",
    },
  ],
  openingLabel: "A contradiction?",
  qualifier: "Different stages call for different treatment",
  connectorLabel: "Context matters",
  contextPlacement: "above",
  showCentralDivider: true,
};
/** Reproducible accepted collection and text-boundary variants. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      statements: [
        {
          id: "a",
          claim: "A",
          context: "C",
        },
        {
          id: "b",
          claim: "B",
          context: "D",
        },
      ],
      openingLabel: "Q",
      qualifier: "E",
      connectorLabel: "J",
      contextPlacement: "below",
      showCentralDivider: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      statements: [
        {
          id: "item-0",
          claim:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
          context:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "item-1",
          claim:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
          context:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      openingLabel: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
      qualifier:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      connectorLabel: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      qualifier: "Different purposes call for different marks",
      contextPlacement: "below",
      showCentralDivider: false,
    },
  },
];
/** Strict keys, text bounds, collection limits, and membership rejections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, statements: null },
  {
    ...DEFAULT_INPUT,
    statements: [
      {
        id: "draft",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    statements: [
      {
        id: "draft",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
      },
      {
        id: "draft",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    statements: [
      {
        id: "draft",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
        extra: true,
      },
      {
        id: "draft",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
        extra: true,
      },
    ],
  },
  { ...DEFAULT_INPUT, openingLabel: "XXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  {
    ...DEFAULT_INPUT,
    qualifier:
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  },
  { ...DEFAULT_INPUT, connectorLabel: "XXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { ...DEFAULT_INPUT, contextPlacement: "unknown" },
  {
    ...DEFAULT_INPUT,
    statements: [
      {
        id: "unique-0",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
      },
      {
        id: "unique-1",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
      },
      {
        id: "unique-2",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    statements: [
      {
        id: "界界界界界界界界界界界界界界界界界界界界界",
        claim: "Keep the marks loose",
        context: "Early fictional sketch",
      },
      {
        id: "final",
        claim: "Make the edges precise",
        context: "Final fictional diagram",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    statements: [
      {
        id: "draft",
        claim:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        context: "Early fictional sketch",
      },
      {
        id: "final",
        claim: "Make the edges precise",
        context: "Final fictional diagram",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    statements: [
      {
        id: "draft",
        claim: "Keep the marks loose",
        context:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      {
        id: "final",
        claim: "Make the edges precise",
        context: "Final fictional diagram",
      },
    ],
  },
];
