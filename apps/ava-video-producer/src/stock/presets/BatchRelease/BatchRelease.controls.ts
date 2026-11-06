import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls with exact accepted structural bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "batches",
    help: {
      id: "motionAtlas.batch-release.controls.batches.help",
      message:
        "Defines exact batch membership and the visible label on each envelope. 1..2 batches; 2..3 items per batch; at most 6 items total; IDs globally unique and <= 16 characters; batch labels <= 18 characters; item labels <= 12 characters",
    },
    label: {
      id: "motionAtlas.batch-release.controls.batches",
      message: "batches",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 2,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "items"],
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 18,
        },
        items: {
          type: "array",
          minItems: 2,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: {
                type: "string",
                minLength: 0,
                maxLength: 16,
              },
              label: {
                type: "string",
                minLength: 0,
                maxLength: 12,
              },
            },
          },
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.batch-release.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.batch-release.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
      },
      {
        path: "items",
        label: {
          id: "motionAtlas.batch-release.controls.items",
          message: "items",
        },
        kind: "collection",
        minItems: 2,
        maxItems: 3,
        itemSchema: {
          type: "object",
          additionalProperties: false,
          required: ["id", "label"],
          properties: {
            id: {
              type: "string",
              minLength: 0,
              maxLength: 16,
            },
            label: {
              type: "string",
              minLength: 0,
              maxLength: 12,
            },
          },
        },
        itemControls: [
          {
            path: "id",
            label: {
              id: "motionAtlas.batch-release.controls.id",
              message: "id",
            },
            kind: "text",
            minLength: 0,
            maxLength: 16,
          },
          {
            path: "label",
            label: {
              id: "motionAtlas.batch-release.controls.label",
              message: "label",
            },
            kind: "text",
            minLength: 0,
            maxLength: 12,
          },
        ],
      },
    ],
  },
  {
    path: "intakeLabel",
    help: {
      id: "motionAtlas.batch-release.controls.intakeLabel.help",
      message:
        "Names the region where individual items arrive. 1..24 characters",
    },
    label: {
      id: "motionAtlas.batch-release.controls.intakeLabel",
      message: "intakeLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 24,
  },
  {
    path: "boundaryLabel",
    help: {
      id: "motionAtlas.batch-release.controls.boundaryLabel.help",
      message:
        "Labels the boundary crossed by each complete batch. 1..20 characters",
    },
    label: {
      id: "motionAtlas.batch-release.controls.boundaryLabel",
      message: "boundaryLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 20,
  },
  {
    path: "destinationLabel",
    help: {
      id: "motionAtlas.batch-release.controls.destinationLabel.help",
      message: "Names the region holding released batches. 1..26 characters",
    },
    label: {
      id: "motionAtlas.batch-release.controls.destinationLabel",
      message: "destinationLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 26,
  },
  {
    path: "releaseLabel",
    help: {
      id: "motionAtlas.batch-release.controls.releaseLabel.help",
      message:
        "Names the release condition when all supplied members have arrived. 1..26 characters; must describe completion of the supplied group, not an unmodeled timer or size threshold",
    },
    label: {
      id: "motionAtlas.batch-release.controls.releaseLabel",
      message: "releaseLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 26,
  },
  {
    path: "showItemLabels",
    help: {
      id: "motionAtlas.batch-release.controls.showItemLabels.help",
      message:
        "Preserves individual labels inside each moving batch envelope. boolean",
    },
    label: {
      id: "motionAtlas.batch-release.controls.showItemLabels",
      message: "showItemLabels",
    },
    kind: "boolean",
  },
];
