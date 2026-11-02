import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls with exact accepted structural bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "tasks",
    help: {
      id: "motionAtlas.schedule-buffer.controls.tasks.help",
      message:
        "The sequential task blocks, their order, and their shared-unit durations. 2..4 tasks; unique IDs <= 16 characters; labels 1..16 characters; integer durations 1..4",
    },
    label: {
      id: "motionAtlas.schedule-buffer.controls.tasks",
      message: "tasks",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "duration"],
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        duration: {
          type: "integer",
          minimum: 1,
          maximum: 4,
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.schedule-buffer.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.schedule-buffer.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "duration",
        label: {
          id: "motionAtlas.schedule-buffer.controls.duration",
          message: "duration",
        },
        kind: "number",
        min: 1,
        max: 4,
        step: 1,
      },
    ],
  },
  {
    path: "reserveUnits",
    help: {
      id: "motionAtlas.schedule-buffer.controls.reserveUnits.help",
      message:
        "Initial unused duration between the last task and the deadline. Integer 1..4; deadline position is derived from task durations plus this reserve",
    },
    label: {
      id: "motionAtlas.schedule-buffer.controls.reserveUnits",
      message: "reserveUnits",
    },
    kind: "number",
    min: 1,
    max: 4,
    step: 1,
  },
  {
    path: "interruption",
    help: {
      id: "motionAtlas.schedule-buffer.controls.interruption.help",
      message:
        "Names the inserted delay, its location in the sequence, and its duration. label 1..18 characters; afterTaskId must identify a nonfinal task; integer duration 1..reserveUnits",
    },
    label: {
      id: "motionAtlas.schedule-buffer.controls.interruption",
      message: "interruption",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.schedule-buffer.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "afterTaskId",
        label: {
          id: "motionAtlas.schedule-buffer.controls.afterTaskId",
          message: "afterTaskId",
        },
        kind: "select",
        optionsFrom: {
          path: "tasks",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "duration",
        label: {
          id: "motionAtlas.schedule-buffer.controls.duration",
          message: "duration",
        },
        kind: "number",
        min: 1,
        max: 4,
        step: 1,
      },
    ],
  },
  {
    path: "scheduleLabels",
    help: {
      id: "motionAtlas.schedule-buffer.controls.scheduleLabels.help",
      message:
        "Names the flexible reserve segment and the fixed endpoint. Both keys required; each label 1..20 characters",
    },
    label: {
      id: "motionAtlas.schedule-buffer.controls.scheduleLabels",
      message: "scheduleLabels",
    },
    kind: "object",
    controls: [
      {
        path: "reserve",
        label: {
          id: "motionAtlas.schedule-buffer.controls.reserve",
          message: "reserve",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "deadline",
        label: {
          id: "motionAtlas.schedule-buffer.controls.deadline",
          message: "deadline",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
  },
  {
    path: "unitLabel",
    help: {
      id: "motionAtlas.schedule-buffer.controls.unitLabel.help",
      message:
        "Names the common unit for tasks, delay, and reserve. 1..12 characters; all durations share this unit",
    },
    label: {
      id: "motionAtlas.schedule-buffer.controls.unitLabel",
      message: "unitLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 12,
  },
  {
    path: "showValues",
    help: {
      id: "motionAtlas.schedule-buffer.controls.showValues.help",
      message:
        "Shows authored durations and the derived remaining reserve next to their segments. boolean",
    },
    label: {
      id: "motionAtlas.schedule-buffer.controls.showValues",
      message: "showValues",
    },
    kind: "boolean",
  },
  {
    path: "resultLabel",
    help: {
      id: "motionAtlas.schedule-buffer.controls.resultLabel.help",
      message:
        "States the authored result above the resolved schedule. 1..38 characters",
    },
    label: {
      id: "motionAtlas.schedule-buffer.controls.resultLabel",
      message: "resultLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 38,
  },
];
