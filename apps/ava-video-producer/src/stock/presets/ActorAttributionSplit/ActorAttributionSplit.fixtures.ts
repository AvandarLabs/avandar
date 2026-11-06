import type { Input } from "./ActorAttributionSplit.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  collaborators: [
    {
      id: "person-a",
      label: "Demo editor A",
      individualAccountId: "account-a",
    },
    {
      id: "person-b",
      label: "Demo editor B",
      individualAccountId: "account-b",
    },
  ],
  accounts: [
    {
      id: "shared",
      label: "Shared demo account",
    },
    {
      id: "account-a",
      label: "Demo account A",
    },
    {
      id: "account-b",
      label: "Demo account B",
    },
  ],
  sharedAccountId: "shared",
  events: [
    {
      id: "event-1",
      collaboratorId: "person-a",
      label: "Draft opened",
      phase: "shared",
    },
    {
      id: "event-2",
      collaboratorId: "person-b",
      label: "Note added",
      phase: "shared",
    },
    {
      id: "event-3",
      collaboratorId: "person-a",
      label: "Draft revised",
      phase: "individual",
    },
    {
      id: "event-4",
      collaboratorId: "person-b",
      label: "Review added",
      phase: "individual",
    },
  ],
  copy: {
    shared: "Earlier shared account",
    individual: "Later distinct accounts",
    choice: "Team adopts separate accounts",
    historyLimit: "Earlier entries keep the shared label",
    ledger: "Recorded account history",
    example: "Fictional actors; account labels only",
  },
  showActionGuides: true,
};
/** Minimum, dense and changed authored cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      collaborators: [
        { ...DEFAULT_INPUT.collaborators[0], label: "A" },
        { ...DEFAULT_INPUT.collaborators[1], label: "B" },
      ],
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      collaborators: [
        {
          ...DEFAULT_INPUT.collaborators[0],
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          ...DEFAULT_INPUT.collaborators[1],
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      accounts: [
        { ...DEFAULT_INPUT.accounts[0], label: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        { ...DEFAULT_INPUT.accounts[1], label: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        { ...DEFAULT_INPUT.accounts[2], label: "WWWWWWWWWWWWWWWWWWWWWWWW" },
      ],
      events: [
        { ...DEFAULT_INPUT.events[0], label: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        { ...DEFAULT_INPUT.events[1], label: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        { ...DEFAULT_INPUT.events[2], label: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        { ...DEFAULT_INPUT.events[3], label: "WWWWWWWWWWWWWWWWWWWWWWWW" },
      ],
      copy: {
        ...DEFAULT_INPUT.copy,
        shared: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        individual: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        choice: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        historyLimit: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        ledger: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      collaborators: [
        {
          ...DEFAULT_INPUT.collaborators[0],
          id: "person-b",
          label: "Demo editor B",
          individualAccountId: "account-b",
        },
        {
          ...DEFAULT_INPUT.collaborators[1],
          id: "person-a",
          label: "Demo editor A",
          individualAccountId: "account-a",
        },
      ],
      showActionGuides: false,
    },
  },
];
/** Rejected complete and malformed documents. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, collaborators: [] },
  { ...DEFAULT_INPUT, sharedAccountId: "missing" },
  {
    ...DEFAULT_INPUT,
    events: [
      DEFAULT_INPUT.events[0],
      {
        ...DEFAULT_INPUT.events[1],
        id: "event-1",
        collaboratorId: "person-a",
        label: "Draft opened",
      },
      {
        ...DEFAULT_INPUT.events[2],
        id: "event-1",
        label: "Draft opened",
        phase: "shared",
      },
      {
        ...DEFAULT_INPUT.events[3],
        id: "event-1",
        collaboratorId: "person-a",
        label: "Draft opened",
        phase: "shared",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    collaborators: [
      DEFAULT_INPUT.collaborators[0],
      {
        ...DEFAULT_INPUT.collaborators[1],
        id: "person-a",
        label: "Demo editor A",
        individualAccountId: "account-a",
      },
    ],
  },
];
