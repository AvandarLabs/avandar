import { BALLOTS_CONTROL } from "./ballotsControl";
import { CLOSING_NOTE_CONTROL } from "./closingNoteControl";
import { LABELS_CONTROL } from "./labelsControl";
import { PROJECTS_CONTROL } from "./projectsControl";
import { SHOW_TOTALS_CONTROL } from "./showTotalsControl";
import { TALLY_ARRANGEMENT_CONTROL } from "./tallyArrangementControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  PROJECTS_CONTROL,
  BALLOTS_CONTROL,
  LABELS_CONTROL,
  SHOW_TOTALS_CONTROL,
  TALLY_ARRANGEMENT_CONTROL,
  CLOSING_NOTE_CONTROL,
];
