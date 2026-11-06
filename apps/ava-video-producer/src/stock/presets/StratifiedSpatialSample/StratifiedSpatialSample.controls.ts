import { COPY_CONTROL } from "./copyControl";
import { SELECTED_SITE_IDS_CONTROL } from "./selectedSiteIdsControl";
import { SHOW_UNSELECTED_LABELS_CONTROL } from "./showUnselectedLabelsControl";
import { SITES_CONTROL } from "./sitesControl";
import { STRATA_CONTROL } from "./strataControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors in document field order. */
export const controls: StockControl[] = [
  STRATA_CONTROL,
  SITES_CONTROL,
  SELECTED_SITE_IDS_CONTROL,
  COPY_CONTROL,
  SHOW_UNSELECTED_LABELS_CONTROL,
];
