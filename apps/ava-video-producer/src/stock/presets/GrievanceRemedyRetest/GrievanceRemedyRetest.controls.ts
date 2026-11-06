import { LABELS_CONTROL } from "./labelsControl";
import { OBJECT_CONTROL } from "./objectControl";
import { PARTICIPANT_RESPONSE_CONTROL } from "./participantResponseControl";
import { PEOPLE_CONTROL } from "./peopleControl";
import { SHOW_COMPLAINT_MARKER_CONTROL } from "./showComplaintMarkerControl";
import { TEST_RESULTS_CONTROL } from "./testResultsControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  PEOPLE_CONTROL,
  OBJECT_CONTROL,
  TEST_RESULTS_CONTROL,
  PARTICIPANT_RESPONSE_CONTROL,
  LABELS_CONTROL,
  SHOW_COMPLAINT_MARKER_CONTROL,
];
