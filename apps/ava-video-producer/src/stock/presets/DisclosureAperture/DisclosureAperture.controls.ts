import type { StockControl } from "../../contracts/StockContract.types";

/** Serializable controls preserve nested fields and collection bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "fields",
    label: {
      id: "motionAtlas.disclosure-aperture.controls.fields",
      message: "fields",
    },
    help: {
      id: "motionAtlas.disclosure-aperture.controls.fields.help",
      message:
        "Document fields and the exact authored disclosure choice for each. Every shared field produces one copy outside the boundary.",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 5,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 22,
        },
        value: {
          type: "string",
          minLength: 0,
          maxLength: 28,
        },
        disclosure: {
          type: "string",
          enum: ["retain", "share"],
        },
      },
      required: ["id", "label", "value", "disclosure"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.fields.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.fields.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.fields.value",
          message: "value",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "disclosure",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.fields.disclosure",
          message: "disclosure",
        },
        kind: "select",
        options: [
          {
            value: "retain",
            label: {
              id: "motionAtlas.disclosure-aperture.options.fields.disclosure.retain",
              message: "retain",
            },
          },
          {
            value: "share",
            label: {
              id: "motionAtlas.disclosure-aperture.options.fields.disclosure.share",
              message: "share",
            },
          },
        ],
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.disclosure-aperture.controls.copy",
      message: "copy",
    },
    help: {
      id: "motionAtlas.disclosure-aperture.controls.copy.help",
      message:
        "All document, boundary, destination, policy, and example labels.",
    },
    kind: "object",
    controls: [
      {
        path: "source",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.copy.source",
          message: "source",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "boundary",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.copy.boundary",
          message: "boundary",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "destination",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.copy.destination",
          message: "destination",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "retain",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.copy.retain",
          message: "retain",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "share",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.copy.share",
          message: "share",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.disclosure-aperture.controls.copy.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "direction",
    label: {
      id: "motionAtlas.disclosure-aperture.controls.direction",
      message: "direction",
    },
    help: {
      id: "motionAtlas.disclosure-aperture.controls.direction.help",
      message:
        "Set the direction in which permitted copies cross the boundary.",
    },
    kind: "select",
    options: [
      {
        value: "left-to-right",
        label: {
          id: "motionAtlas.disclosure-aperture.options.direction.left-to-right",
          message: "left-to-right",
        },
      },
      {
        value: "right-to-left",
        label: {
          id: "motionAtlas.disclosure-aperture.options.direction.right-to-left",
          message: "right-to-left",
        },
      },
    ],
  },
  {
    path: "showPolicyMarks",
    label: {
      id: "motionAtlas.disclosure-aperture.controls.showPolicyMarks",
      message: "showPolicyMarks",
    },
    help: {
      id: "motionAtlas.disclosure-aperture.controls.showPolicyMarks.help",
      message:
        "Show a distinct retained or shared shape next to each field; meaning is also available through supplied captions.",
    },
    kind: "boolean",
  },
  {
    path: "showValues",
    label: {
      id: "motionAtlas.disclosure-aperture.controls.showValues",
      message: "showValues",
    },
    help: {
      id: "motionAtlas.disclosure-aperture.controls.showValues.help",
      message:
        "Display supplied field values or hide them while retaining labels and structural marks.",
    },
    kind: "boolean",
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.disclosure-aperture.controls.showLabels",
      message: "showLabels",
    },
    help: {
      id: "motionAtlas.disclosure-aperture.controls.showLabels.help",
      message:
        "Show all supplied labels and captions; false also hides field values.",
    },
    kind: "boolean",
  },
];
