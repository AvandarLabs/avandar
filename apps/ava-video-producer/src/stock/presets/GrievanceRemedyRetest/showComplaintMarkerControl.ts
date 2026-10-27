import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable showComplaintMarker editor. */
export const SHOW_COMPLAINT_MARKER_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.grievance-remedy-retest.controls.showComplaintMarker.help",
    message:
      "Retain the original complaint marker alongside the tested object. Boolean; hiding the marker does not close the complaint.",
  },
  path: "showComplaintMarker",
  kind: "boolean",
  label: {
    id: "motionAtlas.grievance-remedy-retest.controls.showComplaintMarker",
    message: "showComplaintMarker",
  },
};
