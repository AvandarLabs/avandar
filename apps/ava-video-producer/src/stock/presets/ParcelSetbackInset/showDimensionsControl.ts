import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showDimensions. */
export const SHOW_DIMENSIONS_CONTROL: StockControl = {
  path: "showDimensions",
  label: {
    id: "motionAtlas.parcel-setback-inset.controls.showDimensions",
    message: "showDimensions",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.parcel-setback-inset.controls.showDimensions.help",
    message:
      "Show parcel, inset and footprint dimension ticks. Boolean; clearance band and original parcel outline remain visible.",
  },
};
