import type { Input } from "./ReferralConsentWithdrawal.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  people: {
    participant: "Demo participant",
    worker: "Demo worker",
  },
  permissions: [
    {
      id: "housing",
      recipient: "Demo housing team",
      purpose: "Discuss a referral",
      withdrawn: true,
    },
    {
      id: "learning",
      recipient: "Demo learning team",
      purpose: "Arrange a visit",
      withdrawn: false,
    },
  ],
  plannedContacts: [
    {
      id: "call1",
      permissionId: "housing",
      label: "Prepared phone call",
    },
    {
      id: "call2",
      permissionId: "learning",
      label: "Prepared visit request",
    },
  ],
  priorRecords: [
    {
      id: "past",
      recipient: "Demo housing team",
      dateLabel: "Earlier demo day",
      summary: "Contact details shared",
    },
  ],
  labels: {
    permitted: "Still permitted",
    withdrawn: "Permission withdrawn",
    held: "Do not contact",
    history: "Earlier record remains",
    example: "Fictional consent example",
  },
  showPurpose: true,
};
/** Minimum, dense and changed complete authored inputs. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      people: {
        participant: "Demo participant",
        worker: "Demo worker",
      },
      permissions: [
        {
          id: "",
          recipient: "",
          purpose: "",
          withdrawn: true,
        },
      ],
      plannedContacts: [
        {
          id: "",
          permissionId: "",
          label: "",
        },
      ],
      priorRecords: [],
      labels: {
        permitted: "Still permitted",
        withdrawn: "Permission withdrawn",
        held: "Do not contact",
        history: "Earlier record remains",
        example: "Fictional consent example",
      },
      showPurpose: false,
    },
  },
  {
    id: "dense",
    input: {
      people: {
        participant: "WWWWWWWWWWWWWWWWWWWWWWWW",
        worker: "WWWWWWWWWWWWWWWWWWWWWWWW",
      },
      permissions: [
        {
          id: "housing",
          recipient: "WWWWWWWWWWWWWWWWWWWWWWWW",
          purpose: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          withdrawn: true,
        },
        {
          id: "learning",
          recipient: "WWWWWWWWWWWWWWWWWWWWWWWW",
          purpose: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          withdrawn: false,
        },
        {
          id: "third",
          recipient: "WWWWWWWWWWWWWWWWWWWWWWWW",
          purpose: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          withdrawn: true,
        },
      ],
      plannedContacts: [
        {
          id: "call1",
          permissionId: "housing",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "call2",
          permissionId: "learning",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "call3",
          permissionId: "housing",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      priorRecords: [
        {
          id: "past",
          recipient: "WWWWWWWWWWWWWWWWWWWWWWWW",
          dateLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          summary: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "older",
          recipient: "WWWWWWWWWWWWWWWWWWWWWWWW",
          dateLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
          summary: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      labels: {
        permitted: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        withdrawn: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        held: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        history: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showPurpose: true,
    },
  },
  {
    id: "changed",
    input: {
      people: {
        participant: "Changed participant",
        worker: "Demo worker",
      },
      permissions: [
        {
          id: "",
          recipient: "",
          purpose: "",
          withdrawn: true,
        },
      ],
      plannedContacts: [
        {
          id: "",
          permissionId: "",
          label: "",
        },
      ],
      priorRecords: [],
      labels: {
        permitted: "Still permitted",
        withdrawn: "Permission withdrawn",
        held: "Do not contact",
        history: "Earlier record remains",
        example: "Fictional consent example",
      },
      showPurpose: false,
    },
  },
];
/** Strict and semantic rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    plannedContacts: [
      { ...DEFAULT_INPUT.plannedContacts[0], permissionId: "missing" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    permissions: DEFAULT_INPUT.permissions.map((permission) => ({
      ...permission,
      withdrawn: false,
    })),
  },
  { ...DEFAULT_INPUT, plannedContacts: [DEFAULT_INPUT.plannedContacts[1]] },
  {
    ...DEFAULT_INPUT,
    priorRecords: [
      DEFAULT_INPUT.priorRecords[0],
      DEFAULT_INPUT.priorRecords[0],
    ],
  },
];
