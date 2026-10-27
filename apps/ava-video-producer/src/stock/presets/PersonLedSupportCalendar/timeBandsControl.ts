import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for timeBands. */
export const TIME_BANDS_CONTROL: StockControl = {
  path: "timeBands",
  label: {
    id: "motionAtlas.person-led-support-calendar.controls.timeBands",
    message: "timeBands",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 3,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 16,
      },
      label: {
        type: "string",
        maxLength: 16,
      },
    },
    required: ["id", "label"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.timeBands.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.timeBands.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
  ],
  help: {
    id: "motionAtlas.person-led-support-calendar.controls.timeBands.help",
    message:
      "Set the planner's discrete time bands. 2..3 bands; unique IDs <= 16 characters; labels <= 16 characters; array order is display order.",
  },
};
