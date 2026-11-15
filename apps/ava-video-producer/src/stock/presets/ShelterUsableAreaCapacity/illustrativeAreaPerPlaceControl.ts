import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for illustrativeAreaPerPlace. */
export const ILLUSTRATIVE_AREA_PER_PLACE_CONTROL: StockControl = {
  path: "illustrativeAreaPerPlace",
  label: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.illustrativeAreaPerPlace",
    message: "illustrativeAreaPerPlace",
  },
  kind: "number",
  min: 0.5,
  max: 20,
  help: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.illustrativeAreaPerPlace.help",
    message:
      "Authored divisor for the area-only place-equivalent calculation. 0.5..20, at most 2 decimal places; explicitly fictional, not a recommended minimum; capacity is floor(usable area / divisor).",
  },
};
