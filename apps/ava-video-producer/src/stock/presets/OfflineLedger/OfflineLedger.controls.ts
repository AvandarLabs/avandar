import type { StockControl } from "../../contracts/StockContract.types";

/** Serializable controls preserve nested fields and collection bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "entries",
    label: {
      id: "motionAtlas.offline-ledger.controls.entries",
      message: "entries",
    },
    help: {
      id: "motionAtlas.offline-ledger.controls.entries.help",
      message:
        "Entries written after disconnection, in array order. Each entry creates exactly one local impression.",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
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
      },
      required: ["id", "label", "value"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.offline-ledger.controls.entries.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.offline-ledger.controls.entries.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.offline-ledger.controls.entries.value",
          message: "value",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
    ],
  },
  {
    path: "surfaceLabel",
    label: {
      id: "motionAtlas.offline-ledger.controls.surfaceLabel",
      message: "surfaceLabel",
    },
    help: {
      id: "motionAtlas.offline-ledger.controls.surfaceLabel.help",
      message: "Name of the working surface inside the device.",
    },
    kind: "text",
    minLength: 1,
    maxLength: 32,
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.offline-ledger.controls.copy",
      message: "copy",
    },
    help: {
      id: "motionAtlas.offline-ledger.controls.copy.help",
      message: "All connection, storage, final-state, and example captions.",
    },
    kind: "object",
    controls: [
      {
        path: "connected",
        label: {
          id: "motionAtlas.offline-ledger.controls.copy.connected",
          message: "connected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "offline",
        label: {
          id: "motionAtlas.offline-ledger.controls.copy.offline",
          message: "offline",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "storage",
        label: {
          id: "motionAtlas.offline-ledger.controls.copy.storage",
          message: "storage",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "retained",
        label: {
          id: "motionAtlas.offline-ledger.controls.copy.retained",
          message: "retained",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.offline-ledger.controls.copy.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "deviceShape",
    label: {
      id: "motionAtlas.offline-ledger.controls.deviceShape",
      message: "deviceShape",
    },
    help: {
      id: "motionAtlas.offline-ledger.controls.deviceShape.help",
      message:
        "Choose a device casing or a literal paper notebook metaphor without changing the persistence action.",
    },
    kind: "select",
    options: [
      {
        value: "tablet",
        label: {
          id: "motionAtlas.offline-ledger.options.deviceShape.tablet",
          message: "tablet",
        },
      },
      {
        value: "laptop",
        label: {
          id: "motionAtlas.offline-ledger.options.deviceShape.laptop",
          message: "laptop",
        },
      },
      {
        value: "notebook",
        label: {
          id: "motionAtlas.offline-ledger.options.deviceShape.notebook",
          message: "notebook",
        },
      },
    ],
  },
  {
    path: "showStorageImpressions",
    label: {
      id: "motionAtlas.offline-ledger.controls.showStorageImpressions",
      message: "showStorageImpressions",
    },
    help: {
      id: "motionAtlas.offline-ledger.controls.showStorageImpressions.help",
      message:
        "Expose the matched local impressions beneath the page; the retained-state caption remains available when hidden.",
    },
    kind: "boolean",
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.offline-ledger.controls.showLabels",
      message: "showLabels",
    },
    help: {
      id: "motionAtlas.offline-ledger.controls.showLabels.help",
      message:
        "Show supplied entry text and captions. Hidden labels do not remove the entry strokes or storage impressions.",
    },
    kind: "boolean",
  },
];
