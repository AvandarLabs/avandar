import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for stops. */
export const STOPS_CONTROL: StockControl = {
  path: "stops",
  label: {
    id: "motionAtlas.school-transition-rehearsal.controls.stops",
    message: "stops",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 2,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        minLength: 0,
        maxLength: 16,
      },
      kind: {
        type: "string",
        enum: ["locker", "classroom"],
      },
      label: {
        type: "string",
        minLength: 0,
        maxLength: 24,
      },
      actionLabel: {
        type: "string",
        minLength: 0,
        maxLength: 28,
      },
    },
    required: ["id", "kind", "label", "actionLabel"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.stops.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "kind",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.stops.kind",
        message: "kind",
      },
      kind: "select",
      options: [
        {
          value: "locker",
          label: {
            id: "motionAtlas.school-transition-rehearsal.controls.stops.kind.0",
            message: "locker",
          },
        },
        {
          value: "classroom",
          label: {
            id: "motionAtlas.school-transition-rehearsal.controls.stops.kind.1",
            message: "classroom",
          },
        },
      ],
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.stops.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
    {
      path: "actionLabel",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.stops.actionLabel",
        message: "actionLabel",
      },
      kind: "text",
      minLength: 0,
      maxLength: 28,
    },
  ],
  help: {
    id: "motionAtlas.school-transition-rehearsal.controls.stops.help",
    message:
      "Set the small set of tangible stops and the learner's practice actions. Exactly 2 stops, one locker then one classroom; unique IDs <= 16 characters; labels <= 24 characters; action labels <= 28 characters.",
  },
};
