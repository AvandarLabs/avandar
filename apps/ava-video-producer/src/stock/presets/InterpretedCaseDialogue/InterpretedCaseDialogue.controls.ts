import { BUBBLE_LAYOUT_CONTROL } from "./bubbleLayoutControl";
import { LABELS_CONTROL } from "./labelsControl";
import { LANGUAGES_CONTROL } from "./languagesControl";
import { PEOPLE_CONTROL } from "./peopleControl";
import { SHOW_SIGHTLINES_CONTROL } from "./showSightlinesControl";
import { TURNS_CONTROL } from "./turnsControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive controls in authored input order. */
export const controls: StockControl[] = [
  PEOPLE_CONTROL,
  LANGUAGES_CONTROL,
  TURNS_CONTROL,
  LABELS_CONTROL,
  SHOW_SIGHTLINES_CONTROL,
  BUBBLE_LAYOUT_CONTROL,
];
