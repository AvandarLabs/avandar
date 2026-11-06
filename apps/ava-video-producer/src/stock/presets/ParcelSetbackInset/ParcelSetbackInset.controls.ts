import { COPY_CONTROL } from "./copyControl";
import { PARCELS_CONTROL } from "./parcelsControl";
import { PLACEMENT_CONTROL } from "./placementControl";
import { SETBACK_CONTROL } from "./setbackControl";
import { SHOW_DIMENSIONS_CONTROL } from "./showDimensionsControl";
import { STRUCTURE_CONTROL } from "./structureControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors in document field order. */
export const controls: StockControl[] = [
  PARCELS_CONTROL,
  SETBACK_CONTROL,
  STRUCTURE_CONTROL,
  PLACEMENT_CONTROL,
  COPY_CONTROL,
  SHOW_DIMENSIONS_CONTROL,
];
