import { COMMITMENTS_CONTROL } from "./commitmentsControl";
import { COPY_CONTROL } from "./copyControl";
import { DAYS_CONTROL } from "./daysControl";
import { PEOPLE_CONTROL } from "./peopleControl";
import { SHOW_ORIGINAL_APPOINTMENT_CONTROL } from "./showOriginalAppointmentControl";
import { TIME_BANDS_CONTROL } from "./timeBandsControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive authored input controls. */
export const controls: StockControl[] = [
  PEOPLE_CONTROL,
  DAYS_CONTROL,
  TIME_BANDS_CONTROL,
  COMMITMENTS_CONTROL,
  COPY_CONTROL,
  SHOW_ORIGINAL_APPOINTMENT_CONTROL,
];
