import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showDifference. */
export const SHOW_DIFFERENCE_CONTROL: StockControl = {
  path: "showDifference",
  label: {
    id: "motionAtlas.public-works-measurement-check.controls.showDifference",
    message: "showDifference",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.public-works-measurement-check.controls.showDifference.help",
    message:
      "Label observed minus specified length in addition to the shared ruler. Boolean; signed difference is derived and preserves over-delivery as well as shortfall.",
  },
};
