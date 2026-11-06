import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showQuantities. */
export const SHOW_QUANTITIES_CONTROL: StockControl = {
  path: "showQuantities",
  label: {
    id: "motionAtlas.saved-seed-season-return.controls.showQuantities",
    message: "showQuantities",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.saved-seed-season-return.controls.showQuantities.help",
    message:
      "Shows supplied and derived material quantities with their common unit. When false, the authored choice, destination labels, and evidence label remain visible and material proportions stay unchanged. boolean; the visual quantity model remains identical in either setting",
  },
};
