import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showCellValues. */
export const SHOW_CELL_VALUES_CONTROL: StockControl = {
  path: "showCellValues",
  label: {
    id: "motionAtlas.boundary-regrouping-effect.controls.showCellValues",
    message: "showCellValues",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.boundary-regrouping-effect.controls.showCellValues.help",
    message:
      "Keep the underlying cell fractions visible after regrouping. Boolean; the atomic cell boundaries and overall numerator/denominator always remain.",
  },
};
