import { AREA_PER_TILE_CONTROL } from "./areaPerTileControl";
import { COPY_CONTROL } from "./copyControl";
import { FLOOR_TILES_CONTROL } from "./floorTilesControl";
import { ILLUSTRATIVE_AREA_PER_PLACE_CONTROL } from "./illustrativeAreaPerPlaceControl";
import { KEEP_GROSS_OUTLINE_CONTROL } from "./keepGrossOutlineControl";
import { REGISTERED_PEOPLE_CONTROL } from "./registeredPeopleControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive authored input controls. */
export const controls: StockControl[] = [
  FLOOR_TILES_CONTROL,
  AREA_PER_TILE_CONTROL,
  ILLUSTRATIVE_AREA_PER_PLACE_CONTROL,
  REGISTERED_PEOPLE_CONTROL,
  COPY_CONTROL,
  KEEP_GROSS_OUTLINE_CONTROL,
];
