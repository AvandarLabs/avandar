import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for evidenceLabel. */
export const EVIDENCE_LABEL_CONTROL: StockControl = {
  path: "evidenceLabel",
  label: {
    id: "motionAtlas.saved-seed-season-return.controls.evidenceLabel",
    message: "evidenceLabel",
  },
  kind: "text",
  minLength: 1,
  maxLength: 56,
  help: {
    id: "motionAtlas.saved-seed-season-return.controls.evidenceLabel.help",
    message:
      "Keeps the example's factual status visible across the seasonal transition and resolved hold. 1..56 characters; fictional defaults must retain an explicit fictional label; factual substitutions require supplied quantities and must not assert a predicted yield",
  },
};
