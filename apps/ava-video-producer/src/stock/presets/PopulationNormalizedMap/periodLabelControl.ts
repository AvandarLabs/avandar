import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for periodLabel. */
export const PERIOD_LABEL_CONTROL: StockControl = {
  path: "periodLabel",
  label: {
    id: "motionAtlas.population-normalized-map.controls.periodLabel",
    message: "periodLabel",
  },
  kind: "text",
  minLength: 1,
  maxLength: 36,
  help: {
    id: "motionAtlas.population-normalized-map.controls.periodLabel.help",
    message:
      "One common observation period retained across both maps. 1..36 characters; no mismatched periods across zones.",
  },
};
