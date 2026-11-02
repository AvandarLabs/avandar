import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showPriorOutline. */
export const SHOW_PRIOR_OUTLINE_CONTROL: StockControl = {
  path: "showPriorOutline",
  label: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.showPriorOutline",
    message: "showPriorOutline",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.showPriorOutline.help",
    message:
      "Retain first-snapshot bar outlines inside revised bars. Boolean; both snapshot totals and their cutoff labels always remain.",
  },
};
