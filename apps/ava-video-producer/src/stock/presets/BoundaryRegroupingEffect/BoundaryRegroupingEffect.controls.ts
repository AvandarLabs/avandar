import { CELLS_CONTROL } from "./cellsControl";
import { COPY_CONTROL } from "./copyControl";
import { GROUPINGS_CONTROL } from "./groupingsControl";
import { MEASURE_CONTROL } from "./measureControl";
import { RATE_BASE_CONTROL } from "./rateBaseControl";
import { SHOW_CELL_VALUES_CONTROL } from "./showCellValuesControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive authored input controls. */
export const controls: StockControl[] = [
  CELLS_CONTROL,
  GROUPINGS_CONTROL,
  MEASURE_CONTROL,
  RATE_BASE_CONTROL,
  COPY_CONTROL,
  SHOW_CELL_VALUES_CONTROL,
];
