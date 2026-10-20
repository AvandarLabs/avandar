import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for setback. */
export const SETBACK_CONTROL: StockControl = {
  path: "setback",
  label: {
    id: "motionAtlas.parcel-setback-inset.controls.setback",
    message: "setback",
  },
  kind: "number",
  min: 0,
  max: 15,
  help: {
    id: "motionAtlas.parcel-setback-inset.controls.setback.help",
    message:
      "Uniform inward clearance in the same units as parcel geometry. 0..15; collapse any exhausted envelope to an explicit empty result, never negative dimensions.",
  },
};
