import { LABELS_CONTROL } from "./labelsControl";
import { OBSERVATION_CONTROL } from "./observationControl";
import { OBSERVERS_CONTROL } from "./observersControl";
import { SHOW_DIFFERENCE_CONTROL } from "./showDifferenceControl";
import { SPECIFICATION_CONTROL } from "./specificationControl";
import { STRUCTURE_CONTROL } from "./structureControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  STRUCTURE_CONTROL,
  SPECIFICATION_CONTROL,
  OBSERVATION_CONTROL,
  OBSERVERS_CONTROL,
  SHOW_DIFFERENCE_CONTROL,
  LABELS_CONTROL,
];
