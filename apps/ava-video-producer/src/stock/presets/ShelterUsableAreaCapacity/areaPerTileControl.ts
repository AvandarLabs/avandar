import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for areaPerTile. */
export const AREA_PER_TILE_CONTROL: StockControl = {
  path: "areaPerTile",
  label: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.areaPerTile",
    message: "areaPerTile",
  },
  kind: "number",
  min: 1,
  max: 20,
  help: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.areaPerTile.help",
    message:
      "Area represented by each equal-sized tile. 1..20, at most 2 decimal places; one common area unit for the whole scene.",
  },
};
