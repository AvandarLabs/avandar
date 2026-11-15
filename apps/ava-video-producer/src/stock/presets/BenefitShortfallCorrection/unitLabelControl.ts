import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable unitLabel editor. */
export const UNIT_LABEL_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.benefit-shortfall-correction.controls.unitLabel.help",
    message:
      "Define what each token represents. 1..24 characters; each token equals exactly one displayed unit; no real currency implied.",
  },
  path: "unitLabel",
  kind: "text",
  minLength: 1,
  maxLength: 24,
  label: {
    id: "motionAtlas.benefit-shortfall-correction.controls.unitLabel",
    message: "unitLabel",
  },
};
