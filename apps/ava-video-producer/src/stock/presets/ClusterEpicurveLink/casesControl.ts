import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for cases. */
export const CASES_CONTROL: StockControl = {
  path: "cases",
  label: {
    id: "motionAtlas.cluster-epicurve-link.controls.cases",
    message: "cases",
  },
  kind: "collection",
  minItems: 3,
  maxItems: 12,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 12,
      },
      label: {
        type: "string",
        maxLength: 20,
      },
      x: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      y: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      onsetBinId: {
        anyOf: [
          {
            type: "string",
            maxLength: 12,
          },
          {
            type: "null",
          },
        ],
      },
    },
    required: ["id", "label", "x", "y", "onsetBinId"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.cases.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.cases.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 20,
    },
    {
      path: "x",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.cases.x",
        message: "x",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "y",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.cases.y",
        message: "y",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "onsetBinId",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.cases.onsetBinId",
        message: "onsetBinId",
      },
      nullable: true,
      kind: "select",
      optionsFrom: {
        path: "timeBins",
        valueKey: "id",
        labelKey: "label",
      },
    },
  ],
  help: {
    id: "motionAtlas.cluster-epicurve-link.controls.cases.help",
    message:
      "One fictional case per marker and histogram unit. 3..12 cases; unique IDs <= 12 characters; labels <= 20 characters; coordinates 0..100; onsetBinId references a time bin or is null.",
  },
};
