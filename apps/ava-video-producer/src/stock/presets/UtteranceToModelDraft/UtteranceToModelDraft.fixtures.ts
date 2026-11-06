import type { Input } from "./UtteranceToModelDraft.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  sentenceParts: [
    {
      id: "tool",
      text: "A tool",
    },
    {
      id: "relation",
      text: " belongs to ",
    },
    {
      id: "workshop",
      text: "a workshop",
    },
    {
      id: "stop",
      text: ".",
    },
  ],
  draft: {
    entities: [
      {
        id: "tool-entity",
        label: "Tool",
        partId: "tool",
      },
      {
        id: "workshop-entity",
        label: "Workshop",
        partId: "workshop",
      },
    ],
    relationships: [
      {
        id: "belongs",
        label: "belongs to",
        partId: "relation",
        fromEntityId: "tool-entity",
        toEntityId: "workshop-entity",
      },
    ],
    attributes: [],
  },
  review: {
    outcome: "pending",
    reviewerLabel: "Demo workspace owner",
    note: "Check the proposed relationship",
  },
  copy: {
    source: "Authored description",
    draft: "Proposed model",
    entity: "Entity",
    relationship: "Relationship",
    attribute: "Attribute",
    accepted: "Owner accepted the draft",
    pending: "Awaiting owner review",
    example: "Fictional authored mapping; no live inference",
  },
  showSourceGuides: true,
  modelLayout: "horizontal",
};
/** Minimum, dense and changed authored cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      sentenceParts: [
        { ...DEFAULT_INPUT.sentenceParts[0], id: "a", text: "A" },
        { ...DEFAULT_INPUT.sentenceParts[1], id: "b", text: "B" },
        { ...DEFAULT_INPUT.sentenceParts[2], id: "c", text: "C" },
      ],
      draft: {
        ...DEFAULT_INPUT.draft,
        entities: [
          {
            ...DEFAULT_INPUT.draft.entities[0],
            id: "a",
            label: "A",
            partId: "a",
          },
          {
            ...DEFAULT_INPUT.draft.entities[1],
            id: "b",
            label: "B",
            partId: "b",
          },
        ],
        relationships: [
          {
            ...DEFAULT_INPUT.draft.relationships[0],
            id: "c",
            label: "C",
            partId: "c",
            fromEntityId: "a",
            toEntityId: "b",
          },
        ],
      },
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      sentenceParts: [
        {
          ...DEFAULT_INPUT.sentenceParts[0],
          id: "a",
          text: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          ...DEFAULT_INPUT.sentenceParts[1],
          id: "b",
          text: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          ...DEFAULT_INPUT.sentenceParts[2],
          id: "c",
          text: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        { ...DEFAULT_INPUT.sentenceParts[3], id: "d", text: "WWWWWWWWWWWWWWW" },
        { id: "e", text: " " },
        { id: "f", text: " " },
        { id: "g", text: "." },
      ],
      draft: {
        ...DEFAULT_INPUT.draft,
        entities: [
          {
            ...DEFAULT_INPUT.draft.entities[0],
            id: "a",
            label: "WWWWWWWWWWWWWWWWWWWWWWWW",
            partId: "a",
          },
          {
            ...DEFAULT_INPUT.draft.entities[1],
            id: "b",
            label: "WWWWWWWWWWWWWWWWWWWWWWWW",
            partId: "b",
          },
        ],
        relationships: [
          {
            ...DEFAULT_INPUT.draft.relationships[0],
            id: "c",
            label: "WWWWWWWWWWWWWWWWWWWWWWWW",
            partId: "c",
            fromEntityId: "a",
            toEntityId: "b",
          },
        ],
        attributes: [
          { id: "d", label: "WWWWWWWWWWWWWWW", partId: "d", entityId: "a" },
        ],
      },
      review: {
        ...DEFAULT_INPUT.review,
        reviewerLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        note: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      copy: {
        ...DEFAULT_INPUT.copy,
        source: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        draft: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        entity: "WWWWWWWWWWWWWWWWWW",
        relationship: "WWWWWWWWWWWWWWWWWW",
        attribute: "WWWWWWWWWWWWWWWWWW",
        accepted: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        pending: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      sentenceParts: [
        DEFAULT_INPUT.sentenceParts[0],
        { ...DEFAULT_INPUT.sentenceParts[1], id: "attribute", text: " blue" },
        {
          ...DEFAULT_INPUT.sentenceParts[2],
          id: "relation",
          text: " belongs to ",
        },
        {
          ...DEFAULT_INPUT.sentenceParts[3],
          id: "workshop",
          text: "a workshop",
        },
        { id: "stop", text: "." },
      ],
      draft: {
        ...DEFAULT_INPUT.draft,
        attributes: [
          {
            id: "blue",
            label: "blue",
            partId: "attribute",
            entityId: "tool-entity",
          },
        ],
      },
      review: { ...DEFAULT_INPUT.review, outcome: "accept" },
      showSourceGuides: false,
      modelLayout: "stacked",
    },
  },
];
/** Rejected complete and malformed documents. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, sentenceParts: [] },
  {
    ...DEFAULT_INPUT,
    draft: {
      ...DEFAULT_INPUT.draft,
      entities: [
        { ...DEFAULT_INPUT.draft.entities[0], partId: "missing" },
        DEFAULT_INPUT.draft.entities[1],
      ],
    },
  },
  {
    ...DEFAULT_INPUT,
    draft: {
      ...DEFAULT_INPUT.draft,
      relationships: [
        {
          ...DEFAULT_INPUT.draft.relationships[0],
          fromEntityId: "workshop-entity",
        },
      ],
    },
  },
];
