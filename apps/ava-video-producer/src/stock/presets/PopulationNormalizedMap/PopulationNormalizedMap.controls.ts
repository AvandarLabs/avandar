import { COLOR_DOMAINS_CONTROL } from "./colorDomainsControl";
import { COPY_CONTROL } from "./copyControl";
import { KEEP_FRACTIONS_VISIBLE_CONTROL } from "./keepFractionsVisibleControl";
import { PERIOD_LABEL_CONTROL } from "./periodLabelControl";
import { RATE_BASE_CONTROL } from "./rateBaseControl";
import { ZONES_CONTROL } from "./zonesControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors in document field order. */
export const controls: StockControl[] = [
  ZONES_CONTROL,
  RATE_BASE_CONTROL,
  COLOR_DOMAINS_CONTROL,
  PERIOD_LABEL_CONTROL,
  COPY_CONTROL,
  KEEP_FRACTIONS_VISIBLE_CONTROL,
];
