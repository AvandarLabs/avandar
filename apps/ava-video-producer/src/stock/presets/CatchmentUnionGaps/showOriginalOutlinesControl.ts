import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showOriginalOutlines. */
export const SHOW_ORIGINAL_OUTLINES_CONTROL: StockControl = {
  path: "showOriginalOutlines",
  label: {
    id: "motionAtlas.catchment-union-gaps.controls.showOriginalOutlines",
    message: "showOriginalOutlines",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.catchment-union-gaps.controls.showOriginalOutlines.help",
    message:
      "Keep individual catchment edges after the union forms. Boolean; the union and uncovered records remain visible.",
  },
};
