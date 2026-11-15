import { COPY_CONTROL } from "./copyControl";
import { PARTITION_CONTROL } from "./partitionControl";
import { PEOPLE_CONTROL } from "./peopleControl";
import { REQUEST_LABEL_CONTROL } from "./requestLabelControl";
import { ROOM_LABELS_CONTROL } from "./roomLabelsControl";
import { SHOW_WAITING_SUPPORTER_CONTROL } from "./showWaitingSupporterControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  PEOPLE_CONTROL,
  REQUEST_LABEL_CONTROL,
  ROOM_LABELS_CONTROL,
  PARTITION_CONTROL,
  SHOW_WAITING_SUPPORTER_CONTROL,
  COPY_CONTROL,
];
