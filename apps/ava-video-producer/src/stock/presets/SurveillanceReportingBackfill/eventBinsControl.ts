import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for eventBins. */
export const EVENT_BINS_CONTROL: StockControl = {
  path: "eventBins",
  label: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.eventBins",
    message: "eventBins",
  },
  kind: "collection",
  minItems: 3,
  maxItems: 5,
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
        id: "motionAtlas.surveillance-reporting-backfill.controls.eventBins.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.eventBins.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
  ],
  help: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.eventBins.help",
    message:
      "Ordered equal-duration event-date bins; heights derive from records. 3..5 bins; unique IDs <= 12 characters; labels <= 16 characters; every event predates its reporting snapshot.",
  },
};
