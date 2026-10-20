import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showUnselectedLabels. */
export const SHOW_UNSELECTED_LABELS_CONTROL: StockControl = {
  path: "showUnselectedLabels",
  label: {
    id: "motionAtlas.stratified-spatial-sample.controls.showUnselectedLabels",
    message: "showUnselectedLabels",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.stratified-spatial-sample.controls.showUnselectedLabels.help",
    message:
      "Show names as well as markers for unselected sites. Boolean; unselected markers and denominators cannot be hidden.",
  },
};
