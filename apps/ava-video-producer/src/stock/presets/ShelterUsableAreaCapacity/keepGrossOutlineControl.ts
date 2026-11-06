import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for keepGrossOutline. */
export const KEEP_GROSS_OUTLINE_CONTROL: StockControl = {
  path: "keepGrossOutline",
  label: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.keepGrossOutline",
    message: "keepGrossOutline",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.keepGrossOutline.help",
    message:
      "Retain the original gross floor boundary around the cutaway. Boolean; all excluded area quantities remain visible even if the outline is hidden.",
  },
};
