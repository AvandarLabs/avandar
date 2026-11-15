import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for timeSlots. */
export const TIME_SLOTS_CONTROL: StockControl = {
  path: "timeSlots",
  label: {
    id: "motionAtlas.shared-workshop-booking.controls.timeSlots",
    message: "timeSlots",
  },
  kind: "collection",
  minItems: 2,
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
        maxLength: 18,
      },
    },
    required: ["id", "label"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.timeSlots.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.timeSlots.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 18,
    },
  ],
  help: {
    id: "motionAtlas.shared-workshop-booking.controls.timeSlots.help",
    message:
      "Set the discrete reservable windows. 2..5 slots; unique IDs <= 16 characters; labels <= 18 characters; each slot has equal schematic width, not an inferred real duration.",
  },
};
