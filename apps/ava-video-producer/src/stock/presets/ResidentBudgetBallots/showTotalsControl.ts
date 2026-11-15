import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable showTotals editor. */
export const SHOW_TOTALS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.resident-budget-ballots.controls.showTotals.help",
    message:
      "Display per-project and abstention counts derived from the ballots. Boolean; totals sum to the number of supplied ballots.",
  },
  path: "showTotals",
  kind: "boolean",
  label: {
    id: "motionAtlas.resident-budget-ballots.controls.showTotals",
    message: "showTotals",
  },
};
