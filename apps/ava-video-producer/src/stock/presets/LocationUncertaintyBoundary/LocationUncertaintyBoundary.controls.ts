import { COPY_CONTROL } from "./copyControl";
import { DISTRICTS_CONTROL } from "./districtsControl";
import { FOCUSED_LOCATION_ID_CONTROL } from "./focusedLocationIdControl";
import { LOCATIONS_CONTROL } from "./locationsControl";
import { SHOW_OTHER_FOOTPRINTS_CONTROL } from "./showOtherFootprintsControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive authored input controls. */
export const controls: StockControl[] = [
  DISTRICTS_CONTROL,
  LOCATIONS_CONTROL,
  FOCUSED_LOCATION_ID_CONTROL,
  COPY_CONTROL,
  SHOW_OTHER_FOOTPRINTS_CONTROL,
];
