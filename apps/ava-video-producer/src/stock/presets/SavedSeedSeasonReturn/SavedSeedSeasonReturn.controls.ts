import { BALANCE_LABELS_CONTROL } from "./balanceLabelsControl";
import { CROP_CONTROL } from "./cropControl";
import { CULTIVATOR_CONTROL } from "./cultivatorControl";
import { EVIDENCE_LABEL_CONTROL } from "./evidenceLabelControl";
import { SEASONS_CONTROL } from "./seasonsControl";
import { SHOW_QUANTITIES_CONTROL } from "./showQuantitiesControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  CROP_CONTROL,
  CULTIVATOR_CONTROL,
  SEASONS_CONTROL,
  BALANCE_LABELS_CONTROL,
  EVIDENCE_LABEL_CONTROL,
  SHOW_QUANTITIES_CONTROL,
];
