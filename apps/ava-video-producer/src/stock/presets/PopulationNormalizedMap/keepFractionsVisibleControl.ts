import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for keepFractionsVisible. */
export const KEEP_FRACTIONS_VISIBLE_CONTROL: StockControl = {
  path: "keepFractionsVisible",
  label: {
    id: "motionAtlas.population-normalized-map.controls.keepFractionsVisible",
    message: "keepFractionsVisible",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.population-normalized-map.controls.keepFractionsVisible.help",
    message:
      "Retain each raw numerator and denominator in the resolved view. Boolean; when false retain denominator labels beside each zone rather than hiding them entirely.",
  },
};
