import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable showTotals editor. */
export const SHOW_TOTALS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.benefit-shortfall-correction.controls.showTotals.help",
    message:
      "Show derived totals alongside the physical tokens. Boolean; totals must equal the supplied units; no independent count input.",
  },
  path: "showTotals",
  kind: "boolean",
  label: {
    id: "motionAtlas.benefit-shortfall-correction.controls.showTotals",
    message: "showTotals",
  },
};
