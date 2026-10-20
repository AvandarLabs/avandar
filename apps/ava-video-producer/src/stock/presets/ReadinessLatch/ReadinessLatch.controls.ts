import type { StockControl } from "../../contracts/StockContract.types";

/** Recursive serializable controls retain exact accepted bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "participants",
    label: {
      id: "motionAtlas.readiness-latch.controls.participants",
      message: "participants",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 5,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "ready", "workUnits"],
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        ready: {
          type: "boolean",
        },
        workUnits: {
          type: "integer",
          minimum: 1,
          maximum: 5,
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.readiness-latch.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.readiness-latch.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "ready",
        label: {
          id: "motionAtlas.readiness-latch.controls.ready",
          message: "ready",
        },
        kind: "boolean",
      },
      {
        path: "workUnits",
        label: {
          id: "motionAtlas.readiness-latch.controls.workUnits",
          message: "workUnits",
        },
        kind: "number",
        min: 1,
        max: 5,
        step: 1,
      },
    ],
    help: {
      id: "motionAtlas.readiness-latch.controls.participants.help",
      message:
        "One readiness pin per participant. Work units determine completion order. Array order fixes spatial ribbon order. Every required participant must be ready.",
    },
  },
  {
    path: "sharedAction",
    label: {
      id: "motionAtlas.readiness-latch.controls.sharedAction",
      message: "sharedAction",
    },
    kind: "text",
    minLength: 1,
    maxLength: 32,
    help: {
      id: "motionAtlas.readiness-latch.controls.sharedAction.help",
      message:
        "The common action revealed beyond the opening when the latch can release.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.readiness-latch.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "ready",
        label: {
          id: "motionAtlas.readiness-latch.controls.ready",
          message: "ready",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "waiting",
        label: {
          id: "motionAtlas.readiness-latch.controls.waiting",
          message: "waiting",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "held",
        label: {
          id: "motionAtlas.readiness-latch.controls.held",
          message: "held",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "released",
        label: {
          id: "motionAtlas.readiness-latch.controls.released",
          message: "released",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.readiness-latch.controls.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
    ],
    help: {
      id: "motionAtlas.readiness-latch.controls.copy.help",
      message: "All readiness, final-state, and example captions.",
    },
  },
  {
    path: "orientation",
    label: {
      id: "motionAtlas.readiness-latch.controls.orientation",
      message: "orientation",
    },
    kind: "select",
    options: [
      {
        value: "horizontal",
        label: {
          id: "motionAtlas.readiness-latch.controls.orientation.horizontal",
          message: "horizontal",
        },
      },
      {
        value: "vertical",
        label: {
          id: "motionAtlas.readiness-latch.controls.orientation.vertical",
          message: "vertical",
        },
      },
    ],
    help: {
      id: "motionAtlas.readiness-latch.controls.orientation.help",
      message:
        "Choose the latch orientation while keeping each participant attached to their own pin.",
    },
  },
  {
    path: "showParticipantStates",
    label: {
      id: "motionAtlas.readiness-latch.controls.showParticipantStates",
      message: "showParticipantStates",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.readiness-latch.controls.showParticipantStates.help",
      message:
        "Show the supplied ready or waiting caption beside each pin in addition to its physical position.",
    },
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.readiness-latch.controls.showLabels",
      message: "showLabels",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.readiness-latch.controls.showLabels.help",
      message: "Show participant names, action text, and state captions.",
    },
  },
  {
    path: "showWorkValues",
    label: {
      id: "motionAtlas.readiness-latch.controls.showWorkValues",
      message: "showWorkValues",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.readiness-latch.controls.showWorkValues.help",
      message:
        "Displays each branch's supplied work quantity alongside its label.",
    },
  },
  {
    path: "unitLabel",
    label: {
      id: "motionAtlas.readiness-latch.controls.unitLabel",
      message: "unitLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 16,
    help: {
      id: "motionAtlas.readiness-latch.controls.unitLabel.help",
      message: "Provides the unit for the supplied relative work quantities.",
    },
  },
];
