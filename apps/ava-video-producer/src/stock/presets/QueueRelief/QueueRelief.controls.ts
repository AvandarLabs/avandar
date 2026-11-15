import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for every authored field. */
export const CONTROLS: StockControl[] = [
  {
    path: "items",
    label: {
      id: "motionAtlas.queue-relief.controls.items",
      message: "items",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 8,
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
          maxLength: 14,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.queue-relief.controls.items.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
        multiline: true,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.queue-relief.controls.items.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 14,
        multiline: true,
      },
    ],
  },
  {
    path: "serviceSlots",
    label: {
      id: "motionAtlas.queue-relief.controls.serviceSlots",
      message: "serviceSlots",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
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
          maxLength: 18,
        },
        initiallyOpen: {
          type: "boolean",
        },
      },
      required: ["id", "label", "initiallyOpen"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.queue-relief.controls.serviceSlots.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
        multiline: true,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.queue-relief.controls.serviceSlots.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
        multiline: true,
      },
      {
        path: "initiallyOpen",
        label: {
          id: "motionAtlas.queue-relief.controls.serviceSlots.initiallyOpen",
          message: "initiallyOpen",
        },
        kind: "boolean",
      },
    ],
  },
  {
    path: "queueLabel",
    label: {
      id: "motionAtlas.queue-relief.controls.queueLabel",
      message: "queueLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 24,
    multiline: true,
  },
  {
    path: "completionLabel",
    label: {
      id: "motionAtlas.queue-relief.controls.completionLabel",
      message: "completionLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 24,
    multiline: true,
  },
  {
    path: "capacityChangeLabel",
    label: {
      id: "motionAtlas.queue-relief.controls.capacityChangeLabel",
      message: "capacityChangeLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 36,
    multiline: true,
  },
  {
    path: "showItemLabels",
    label: {
      id: "motionAtlas.queue-relief.controls.showItemLabels",
      message: "showItemLabels",
    },
    kind: "boolean",
  },
];
