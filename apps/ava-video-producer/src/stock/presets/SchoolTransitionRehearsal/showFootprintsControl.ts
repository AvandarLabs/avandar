import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showFootprints. */
export const SHOW_FOOTPRINTS_CONTROL: StockControl = {
  path: "showFootprints",
  label: {
    id: "motionAtlas.school-transition-rehearsal.controls.showFootprints",
    message: "showFootprints",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.school-transition-rehearsal.controls.showFootprints.help",
    message:
      "Retain faint footprints of the practiced route. Boolean; footprints represent only this rehearsal, never attendance history or location tracking.",
  },
};
