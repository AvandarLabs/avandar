import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for observers. */
export const OBSERVERS_CONTROL: StockControl = {
  path: "observers",
  label: {
    id: "motionAtlas.public-works-measurement-check.controls.observers",
    message: "observers",
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
      label: {
        type: "string",
        minLength: 0,
        maxLength: 24,
      },
    },
    required: ["id", "label"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.observers.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.observers.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
  ],
  help: {
    id: "motionAtlas.public-works-measurement-check.controls.observers.help",
    message:
      "Name the two people holding the tape endpoints. Exactly 2 observers; unique IDs <= 16 characters; labels <= 24 characters.",
  },
};
