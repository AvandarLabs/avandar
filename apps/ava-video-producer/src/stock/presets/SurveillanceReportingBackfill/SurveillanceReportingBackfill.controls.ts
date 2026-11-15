import { COPY_CONTROL } from "./copyControl";
import { EVENT_BINS_CONTROL } from "./eventBinsControl";
import { RECORDS_CONTROL } from "./recordsControl";
import { SHOW_PRIOR_OUTLINE_CONTROL } from "./showPriorOutlineControl";
import { SNAPSHOTS_CONTROL } from "./snapshotsControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive authored input controls. */
export const controls: StockControl[] = [
  RECORDS_CONTROL,
  EVENT_BINS_CONTROL,
  SNAPSHOTS_CONTROL,
  COPY_CONTROL,
  SHOW_PRIOR_OUTLINE_CONTROL,
];
