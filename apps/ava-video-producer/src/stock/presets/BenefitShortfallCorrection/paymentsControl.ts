import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable payments editor. */
export const PAYMENTS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.benefit-shortfall-correction.controls.payments.help",
    message:
      "Set stated, originally received and separately corrected quantities. 1..2 payments; unique IDs <= 16 characters; labels <= 24 characters; all quantities integers 0..8; statedUnits >= 1; receivedUnits + correctionUnits <= statedUnits; at most 12 stated units overall; at least one original shortfall.",
  },
  path: "payments",
  kind: "collection",
  minItems: 1,
  maxItems: 2,
  itemControls: [
    {
      path: "id",
      kind: "text",
      minLength: 0,
      maxLength: 16,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.payments.id",
        message: "id",
      },
    },
    {
      path: "label",
      kind: "text",
      minLength: 0,
      maxLength: 24,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.payments.label",
        message: "label",
      },
    },
    {
      path: "statedUnits",
      kind: "number",
      min: 1,
      max: 8,
      step: 1,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.payments.statedUnits",
        message: "statedUnits",
      },
    },
    {
      path: "receivedUnits",
      kind: "number",
      min: 0,
      max: 8,
      step: 1,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.payments.receivedUnits",
        message: "receivedUnits",
      },
    },
    {
      path: "correctionUnits",
      kind: "number",
      min: 0,
      max: 8,
      step: 1,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.payments.correctionUnits",
        message: "correctionUnits",
      },
    },
  ],
  label: {
    id: "motionAtlas.benefit-shortfall-correction.controls.payments",
    message: "payments",
  },
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
      statedUnits: {
        type: "integer",
        minimum: 1,
        maximum: 8,
      },
      receivedUnits: {
        type: "integer",
        minimum: 0,
        maximum: 8,
      },
      correctionUnits: {
        type: "integer",
        minimum: 0,
        maximum: 8,
      },
    },
    required: [
      "id",
      "label",
      "statedUnits",
      "receivedUnits",
      "correctionUnits",
    ],
    additionalProperties: false,
  },
};
