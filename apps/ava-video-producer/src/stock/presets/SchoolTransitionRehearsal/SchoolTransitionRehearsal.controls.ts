import { FINAL_STEP_SUPPORT_CONTROL } from "./finalStepSupportControl";
import { LABELS_CONTROL } from "./labelsControl";
import { PEOPLE_CONTROL } from "./peopleControl";
import { SHOW_FOOTPRINTS_CONTROL } from "./showFootprintsControl";
import { SHOW_PRACTICE_STRIP_CONTROL } from "./showPracticeStripControl";
import { STOPS_CONTROL } from "./stopsControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  PEOPLE_CONTROL,
  STOPS_CONTROL,
  FINAL_STEP_SUPPORT_CONTROL,
  SHOW_PRACTICE_STRIP_CONTROL,
  LABELS_CONTROL,
  SHOW_FOOTPRINTS_CONTROL,
];
