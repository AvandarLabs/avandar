import type { Input } from "./ExpertiseRoleExchange.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  people: [
    { id: "mara", label: "Mara", roleLabel: "Project lead" },
    { id: "eli", label: "Eli", roleLabel: "Local adviser" },
  ],
  topics: [
    {
      id: "layout",
      label: "Document layout",
      expertId: "mara",
      demonstration: "fold-guide",
    },
    {
      id: "marking",
      label: "Workshop marking",
      expertId: "eli",
      demonstration: "align-ruler",
    },
  ],
  labels: {
    demonstrates: "Demonstrates",
    learns: "Learns",
    example: "Fictional peer learning",
  },
  showJobRoles: true,
  tableArrangement: "side-by-side",
  closingLabel: "Different knowledge, shared learning",
};
/**
 * Minimum, maximum-density and changed semantics exercise authored variants.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      people: [
        { id: "a", label: "A", roleLabel: "R" },
        { id: "b", label: "B", roleLabel: "S" },
      ],
      topics: [
        { id: "a", label: "A", expertId: "a", demonstration: "fold-guide" },
        { id: "b", label: "B", expertId: "b", demonstration: "align-ruler" },
      ],
      labels: { demonstrates: "D", learns: "L", example: "F" },
      showJobRoles: false,
      tableArrangement: "opposite-sides",
      closingLabel: "D",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      people: [
        {
          id: " ppppppppppppppppppp",
          label: "WWWWWWWWWWWWWWWWWW",
          roleLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "界ppppppppppppppppppp",
          label: "WWWWWWWWWWWWWWWWWW",
          roleLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      topics: [
        {
          ...DEFAULT_INPUT.topics[0],
          id: "0ttttttttttttttttttt",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          expertId: " ppppppppppppppppppp",
        },
        {
          ...DEFAULT_INPUT.topics[1],
          id: "1ttttttttttttttttttt",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          expertId: "界ppppppppppppppppppp",
        },
      ],
      labels: {
        demonstrates: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        learns: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      closingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      topics: [
        { ...DEFAULT_INPUT.topics[0], expertId: "eli" },
        { ...DEFAULT_INPUT.topics[1], expertId: "mara" },
      ],
      tableArrangement: "opposite-sides",
    },
  },
];
/** Rejection documents preserve all unaffected input fields. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, people: [DEFAULT_INPUT.people[0]] },
  { ...DEFAULT_INPUT, topics: [DEFAULT_INPUT.topics[0]] },
  {
    ...DEFAULT_INPUT,
    people: [DEFAULT_INPUT.people[0], DEFAULT_INPUT.people[0]],
  },
  {
    ...DEFAULT_INPUT,
    topics: [DEFAULT_INPUT.topics[0], DEFAULT_INPUT.topics[0]],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      { ...DEFAULT_INPUT.topics[0], expertId: "missing" },
      DEFAULT_INPUT.topics[1],
    ],
  },
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    people: [
      { ...DEFAULT_INPUT.people[0], extra: true },
      DEFAULT_INPUT.people[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      { ...DEFAULT_INPUT.people[0], id: "INVALID" },
      DEFAULT_INPUT.people[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      { ...DEFAULT_INPUT.people[0], label: "" },
      DEFAULT_INPUT.people[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      {
        ...DEFAULT_INPUT.people[0],
        label:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.people[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      { ...DEFAULT_INPUT.people[0], roleLabel: "" },
      DEFAULT_INPUT.people[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      {
        ...DEFAULT_INPUT.people[0],
        roleLabel:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.people[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      DEFAULT_INPUT.people[0],
      { ...DEFAULT_INPUT.people[1], extra: true },
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      DEFAULT_INPUT.people[0],
      { ...DEFAULT_INPUT.people[1], id: "INVALID" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      DEFAULT_INPUT.people[0],
      { ...DEFAULT_INPUT.people[1], label: "" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      DEFAULT_INPUT.people[0],
      {
        ...DEFAULT_INPUT.people[1],
        label:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      DEFAULT_INPUT.people[0],
      { ...DEFAULT_INPUT.people[1], roleLabel: "" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    people: [
      DEFAULT_INPUT.people[0],
      {
        ...DEFAULT_INPUT.people[1],
        roleLabel:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      { ...DEFAULT_INPUT.topics[0], extra: true },
      DEFAULT_INPUT.topics[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      { ...DEFAULT_INPUT.topics[0], label: "" },
      DEFAULT_INPUT.topics[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      {
        ...DEFAULT_INPUT.topics[0],
        label:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.topics[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      { ...DEFAULT_INPUT.topics[0], expertId: "INVALID" },
      DEFAULT_INPUT.topics[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      { ...DEFAULT_INPUT.topics[0], demonstration: "INVALID" },
      DEFAULT_INPUT.topics[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      DEFAULT_INPUT.topics[0],
      { ...DEFAULT_INPUT.topics[1], extra: true },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      DEFAULT_INPUT.topics[0],
      { ...DEFAULT_INPUT.topics[1], label: "" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      DEFAULT_INPUT.topics[0],
      {
        ...DEFAULT_INPUT.topics[1],
        label:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      DEFAULT_INPUT.topics[0],
      { ...DEFAULT_INPUT.topics[1], expertId: "INVALID" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    topics: [
      DEFAULT_INPUT.topics[0],
      { ...DEFAULT_INPUT.topics[1], demonstration: "INVALID" },
    ],
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, demonstrates: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      demonstrates:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, learns: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      learns:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, example: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      example:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, showJobRoles: "true" },
  { ...DEFAULT_INPUT, tableArrangement: "INVALID" },
  { ...DEFAULT_INPUT, closingLabel: "" },
  {
    ...DEFAULT_INPUT,
    closingLabel:
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
];
