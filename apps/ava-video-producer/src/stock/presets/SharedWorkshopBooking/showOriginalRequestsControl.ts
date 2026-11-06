import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showOriginalRequests. */
export const SHOW_ORIGINAL_REQUESTS_CONTROL: StockControl = {
  path: "showOriginalRequests",
  label: {
    id: "motionAtlas.shared-workshop-booking.controls.showOriginalRequests",
    message: "showOriginalRequests",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.shared-workshop-booking.controls.showOriginalRequests.help",
    message:
      "Keep dotted original requests above the agreed bookings. Boolean; dotted requests never count as additional machine usage.",
  },
};
