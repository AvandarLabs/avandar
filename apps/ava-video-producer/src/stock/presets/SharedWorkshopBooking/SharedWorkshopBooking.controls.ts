import { LABELS_CONTROL } from "./labelsControl";
import { MACHINE_CONTROL } from "./machineControl";
import { REQUESTS_CONTROL } from "./requestsControl";
import { SHOW_ORIGINAL_REQUESTS_CONTROL } from "./showOriginalRequestsControl";
import { SHOW_USAGE_TURNS_CONTROL } from "./showUsageTurnsControl";
import { TIME_SLOTS_CONTROL } from "./timeSlotsControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  MACHINE_CONTROL,
  TIME_SLOTS_CONTROL,
  REQUESTS_CONTROL,
  LABELS_CONTROL,
  SHOW_ORIGINAL_REQUESTS_CONTROL,
  SHOW_USAGE_TURNS_CONTROL,
];
