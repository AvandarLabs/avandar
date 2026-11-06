import { LABELS_CONTROL } from "./labelsControl";
import { PEOPLE_CONTROL } from "./peopleControl";
import { PERMISSIONS_CONTROL } from "./permissionsControl";
import { PLANNED_CONTACTS_CONTROL } from "./plannedContactsControl";
import { PRIOR_RECORDS_CONTROL } from "./priorRecordsControl";
import { SHOW_PURPOSE_CONTROL } from "./showPurposeControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  PEOPLE_CONTROL,
  PERMISSIONS_CONTROL,
  PLANNED_CONTACTS_CONTROL,
  PRIOR_RECORDS_CONTROL,
  LABELS_CONTROL,
  SHOW_PURPOSE_CONTROL,
];
