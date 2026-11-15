import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors for every supplied field. */
export const CONTROLS: StockControl[] = [
  {
    path: "collaborators",
    label: {
      id: "motionAtlas.actor-attribution-split.controls.collaborators",
      message: "Collaborators",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        individualAccountId: {
          type: "string",
        },
      },
      required: ["id", "label", "individualAccountId"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.collaborators.id",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.collaborators.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "individualAccountId",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.collaborators.individualAccountId",
          message: "Individual account id",
        },
        kind: "select",
        optionsFrom: {
          path: "accounts",
          valueKey: "id",
          labelKey: "label",
        },
      },
    ],
  },
  {
    path: "accounts",
    label: {
      id: "motionAtlas.actor-attribution-split.controls.accounts",
      message: "Accounts",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.accounts.id",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.accounts.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
  },
  {
    path: "sharedAccountId",
    label: {
      id: "motionAtlas.actor-attribution-split.controls.sharedAccountId",
      message: "Shared account id",
    },
    kind: "select",
    optionsFrom: {
      path: "accounts",
      valueKey: "id",
      labelKey: "label",
    },
  },
  {
    path: "events",
    label: {
      id: "motionAtlas.actor-attribution-split.controls.events",
      message: "Events",
    },
    kind: "collection",
    minItems: 4,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        collaboratorId: {
          type: "string",
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        phase: {
          enum: ["shared", "individual"],
        },
      },
      required: ["id", "collaboratorId", "label", "phase"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.events.id",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "collaboratorId",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.events.collaboratorId",
          message: "Collaborator id",
        },
        kind: "select",
        optionsFrom: {
          path: "collaborators",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.events.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "phase",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.events.phase",
          message: "Phase",
        },
        kind: "select",
        options: [
          {
            value: "shared",
            label: {
              id: "motionAtlas.actor-attribution-split.controls.events.phase.shared",
              message: "shared",
            },
          },
          {
            value: "individual",
            label: {
              id: "motionAtlas.actor-attribution-split.controls.events.phase.individual",
              message: "individual",
            },
          },
        ],
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.actor-attribution-split.controls.copy",
      message: "Copy",
    },
    kind: "object",
    controls: [
      {
        path: "shared",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.copy.shared",
          message: "Shared",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "individual",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.copy.individual",
          message: "Individual",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "choice",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.copy.choice",
          message: "Choice",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "historyLimit",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.copy.historyLimit",
          message: "History limit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "ledger",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.copy.ledger",
          message: "Ledger",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.actor-attribution-split.controls.copy.example",
          message: "Example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
    ],
  },
  {
    path: "showActionGuides",
    label: {
      id: "motionAtlas.actor-attribution-split.controls.showActionGuides",
      message: "Show action guides",
    },
    kind: "boolean",
  },
];
