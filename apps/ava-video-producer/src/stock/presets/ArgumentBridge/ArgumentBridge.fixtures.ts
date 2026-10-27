import type { Input } from "./ArgumentBridge.schema";
/** Complete fictional content, used only for an omitted entire input. */
export const DEFAULT_INPUT: Input = {
  premises: [
    {
      id: "space",
      text: "The fictional room has one clear wall",
    },
    {
      id: "audience",
      text: "Everyone faces that wall",
    },
  ],
  conclusion: "Place the example board on that wall",
  relationship: "supports",
  connectorText: "Together, these support",
  premiseHeading: "Given these fictional conditions",
  showIndividualSupports: true,
};
/** Reproducible accepted collection and text-boundary variants. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      premises: [
        {
          id: "a",
          text: "A",
        },
        {
          id: "b",
          text: "B",
        },
      ],
      conclusion: "C",
      relationship: "supports",
      connectorText: "Support",
      premiseHeading: "",
      showIndividualSupports: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      premises: [
        {
          id: "item-0",
          text: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "item-1",
          text: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "item-2",
          text: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      conclusion:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      connectorText:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      premiseHeading:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      premises: [
        {
          id: "space",
          text: "The fictional room has one clear wall",
        },
        {
          id: "audience",
          text: "Everyone faces that wall",
        },
        {
          id: "reach",
          text: "The board stays within reach",
        },
      ],
      conclusion: "Use the fictional wall board",
      relationship: "suggests",
      connectorText: "Together, these suggest",
      showIndividualSupports: false,
    },
  },
];
/** Strict keys, text bounds, collection limits, and membership rejections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, premises: null },
  {
    ...DEFAULT_INPUT,
    premises: [
      {
        id: "space",
        text: "The fictional room has one clear wall",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    premises: [
      {
        id: "space",
        text: "The fictional room has one clear wall",
      },
      {
        id: "space",
        text: "The fictional room has one clear wall",
      },
      {
        id: "space",
        text: "The fictional room has one clear wall",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    premises: [
      {
        id: "space",
        text: "The fictional room has one clear wall",
        extra: true,
      },
      {
        id: "space",
        text: "The fictional room has one clear wall",
        extra: true,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    conclusion:
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  },
  { ...DEFAULT_INPUT, relationship: "unknown" },
  { ...DEFAULT_INPUT, connectorText: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  {
    ...DEFAULT_INPUT,
    premises: [
      {
        id: "unique-0",
        text: "The fictional room has one clear wall",
      },
      {
        id: "unique-1",
        text: "The fictional room has one clear wall",
      },
      {
        id: "unique-2",
        text: "The fictional room has one clear wall",
      },
      {
        id: "unique-3",
        text: "The fictional room has one clear wall",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    premises: [
      {
        id: "界界界界界界界界界界界界界界界界界界界界界",
        text: "The fictional room has one clear wall",
      },
      {
        id: "audience",
        text: "Everyone faces that wall",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    premises: [
      {
        id: "space",
        text: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      {
        id: "audience",
        text: "Everyone faces that wall",
      },
    ],
  },
];
