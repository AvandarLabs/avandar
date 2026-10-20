import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for snapshots. */
export const SNAPSHOTS_CONTROL: StockControl = {
  path: "snapshots",
  label: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.snapshots",
    message: "snapshots",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 2,
  itemSchema: {
    type: "object",
    properties: {
      label: {
        type: "string",
        maxLength: 32,
      },
    },
    required: ["label"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "label",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.snapshots.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 32,
    },
  ],
  help: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.snapshots.help",
    message:
      "The two reporting cutoffs being compared. Exactly 2 chronological snapshots; labels <= 32 characters; these are reporting cutoffs, not event-bin labels.",
  },
};
