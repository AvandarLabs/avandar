import type { Input } from "./SharedFoundation.schema";
/** Complete fictional content, used only for an omitted entire input. */
export const DEFAULT_INPUT: Input = {
  approaches: [
    {
      id: "written",
      label: "Written directions",
      distinction: "Read a short description",
    },
    {
      id: "drawn",
      label: "Drawn directions",
      distinction: "Follow a simple diagram",
    },
  ],
  sharedPrinciple: "Make the fictional route understandable",
  foundationLabel: "A shared purpose",
  openingConnector: "Different forms",
  showDistinctTraits: true,
  foundationReveal: "join",
};
/** Reproducible accepted collection and text-boundary variants. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      approaches: [
        {
          id: "a",
          label: "A",
          distinction: "X",
        },
        {
          id: "b",
          label: "B",
          distinction: "Y",
        },
      ],
      sharedPrinciple: "P",
      foundationLabel: "F",
      openingConnector: "",
      showDistinctTraits: false,
      foundationReveal: "uncover",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      approaches: [
        {
          id: "item-0",
          label: "界界界界界界界界界界界界界界界界界界界界界界界界",
          distinction:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
        {
          id: "item-1",
          label: "界界界界界界界界界界界界界界界界界界界界界界界界",
          distinction:
            "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        },
      ],
      sharedPrinciple:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      foundationLabel: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
      openingConnector: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      sharedPrinciple: "Help a fictional visitor find the room",
      showDistinctTraits: false,
      foundationReveal: "uncover",
    },
  },
];
/** Strict keys, text bounds, collection limits, and membership rejections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, approaches: null },
  {
    ...DEFAULT_INPUT,
    approaches: [
      {
        id: "written",
        label: "Written directions",
        distinction: "Read a short description",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    approaches: [
      {
        id: "written",
        label: "Written directions",
        distinction: "Read a short description",
      },
      {
        id: "written",
        label: "Written directions",
        distinction: "Read a short description",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    approaches: [
      {
        id: "written",
        label: "Written directions",
        distinction: "Read a short description",
        extra: true,
      },
      {
        id: "written",
        label: "Written directions",
        distinction: "Read a short description",
        extra: true,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    sharedPrinciple:
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  },
  { ...DEFAULT_INPUT, foundationLabel: "XXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { ...DEFAULT_INPUT, foundationReveal: "unknown" },
  {
    ...DEFAULT_INPUT,
    approaches: [
      {
        id: "unique-0",
        label: "Written directions",
        distinction: "Read a short description",
      },
      {
        id: "unique-1",
        label: "Written directions",
        distinction: "Read a short description",
      },
      {
        id: "unique-2",
        label: "Written directions",
        distinction: "Read a short description",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    approaches: [
      {
        id: "界界界界界界界界界界界界界界界界界界界界界",
        label: "Written directions",
        distinction: "Read a short description",
      },
      {
        id: "drawn",
        label: "Drawn directions",
        distinction: "Follow a simple diagram",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    approaches: [
      {
        id: "written",
        label: "界界界界界界界界界界界界界界界界界界界界界界界界界",
        distinction: "Read a short description",
      },
      {
        id: "drawn",
        label: "Drawn directions",
        distinction: "Follow a simple diagram",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    approaches: [
      {
        id: "written",
        label: "Written directions",
        distinction:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      {
        id: "drawn",
        label: "Drawn directions",
        distinction: "Follow a simple diagram",
      },
    ],
  },
];
