import { CATCHMENTS_CONTROL } from "./catchmentsControl";
import { COPY_CONTROL } from "./copyControl";
import { GAP_EMPHASIS_CONTROL } from "./gapEmphasisControl";
import { HOUSEHOLDS_CONTROL } from "./householdsControl";
import { MEASURE_CONTROL } from "./measureControl";
import { SHOW_ORIGINAL_OUTLINES_CONTROL } from "./showOriginalOutlinesControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors in document field order. */
export const controls: StockControl[] = [
  CATCHMENTS_CONTROL,
  HOUSEHOLDS_CONTROL,
  MEASURE_CONTROL,
  GAP_EMPHASIS_CONTROL,
  COPY_CONTROL,
  SHOW_ORIGINAL_OUTLINES_CONTROL,
];
