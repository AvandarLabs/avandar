import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for days. */
export const DAYS_CONTROL: StockControl = {
  path: "days",
  label: {
    id: "motionAtlas.person-led-support-calendar.controls.days",
    message: "days",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 4,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 16,
      },
      label: {
        type: "string",
        maxLength: 20,
      },
    },
    required: ["id", "label"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.days.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.days.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 20,
    },
  ],
  help: {
    id: "motionAtlas.person-led-support-calendar.controls.days.help",
    message:
      "Set the visible planner columns. 2..4 days; unique IDs <= 16 characters; labels <= 20 characters.",
  },
};
