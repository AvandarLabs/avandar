import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for focusedLocationId. */
export const FOCUSED_LOCATION_ID_CONTROL: StockControl = {
  path: "focusedLocationId",
  label: {
    id: "motionAtlas.location-uncertainty-boundary.controls.focusedLocationId",
    message: "focusedLocationId",
  },
  kind: "select",
  optionsFrom: {
    path: "locations",
    valueKey: "id",
    labelKey: "label",
  },
  help: {
    id: "motionAtlas.location-uncertainty-boundary.controls.focusedLocationId.help",
    message:
      "The record whose uncertainty expansion receives the central explanation. An existing location ID; all record footprints still participate in final assignment accounting.",
  },
};
