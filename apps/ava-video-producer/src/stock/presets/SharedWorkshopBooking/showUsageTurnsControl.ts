import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showUsageTurns. */
export const SHOW_USAGE_TURNS_CONTROL: StockControl = {
  path: "showUsageTurns",
  label: {
    id: "motionAtlas.shared-workshop-booking.controls.showUsageTurns",
    message: "showUsageTurns",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.shared-workshop-booking.controls.showUsageTurns.help",
    message:
      "Show a brief illustrative use gesture for each agreed participant. Boolean; use gestures illustrate the schedule and do not claim completed production or income.",
  },
};
