import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for timeBins. */
export const TIME_BINS_CONTROL: StockControl = {
  path: "timeBins",
  label: {
    id: "motionAtlas.cluster-epicurve-link.controls.timeBins",
    message: "timeBins",
  },
  kind: "collection",
  minItems: 3,
  maxItems: 6,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 12,
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
        id: "motionAtlas.cluster-epicurve-link.controls.timeBins.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.timeBins.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
  ],
  help: {
    id: "motionAtlas.cluster-epicurve-link.controls.timeBins.help",
    message:
      "Ordered, equal-duration onset bins. 3..6 bins in chronological order; unique IDs <= 12 characters; labels <= 16 characters; no independent bar counts.",
  },
};
