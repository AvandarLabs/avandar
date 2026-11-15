import { EXAMPLE_LABEL_CONTROL } from "./exampleLabelControl";
import { LABELS_CONTROL } from "./labelsControl";
import { PAYMENTS_CONTROL } from "./paymentsControl";
import { PEOPLE_CONTROL } from "./peopleControl";
import { SHOW_TOTALS_CONTROL } from "./showTotalsControl";
import { UNIT_LABEL_CONTROL } from "./unitLabelControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  PEOPLE_CONTROL,
  PAYMENTS_CONTROL,
  UNIT_LABEL_CONTROL,
  LABELS_CONTROL,
  SHOW_TOTALS_CONTROL,
  EXAMPLE_LABEL_CONTROL,
];
