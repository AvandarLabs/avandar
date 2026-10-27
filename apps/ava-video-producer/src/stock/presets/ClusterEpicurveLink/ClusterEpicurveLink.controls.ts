import { CASES_CONTROL } from "./casesControl";
import { COPY_CONTROL } from "./copyControl";
import { FOCUSED_BIN_ID_CONTROL } from "./focusedBinIdControl";
import { INVESTIGATION_CASE_IDS_CONTROL } from "./investigationCaseIdsControl";
import { SHOW_IDENTITY_GUIDES_CONTROL } from "./showIdentityGuidesControl";
import { TIME_BINS_CONTROL } from "./timeBinsControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors in document field order. */
export const controls: StockControl[] = [
  CASES_CONTROL,
  TIME_BINS_CONTROL,
  INVESTIGATION_CASE_IDS_CONTROL,
  FOCUSED_BIN_ID_CONTROL,
  COPY_CONTROL,
  SHOW_IDENTITY_GUIDES_CONTROL,
];
