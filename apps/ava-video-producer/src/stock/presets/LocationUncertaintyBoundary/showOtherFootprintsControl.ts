import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showOtherFootprints. */
export const SHOW_OTHER_FOOTPRINTS_CONTROL: StockControl = {
  path: "showOtherFootprints",
  label: {
    id: "motionAtlas.location-uncertainty-boundary.controls.showOtherFootprints",
    message: "showOtherFootprints",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.location-uncertainty-boundary.controls.showOtherFootprints.help",
    message:
      "Display uncertainty circles for records other than the focused example. Boolean; hiding their circles cannot change accounting or conceal unresolved markers.",
  },
};
