import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable exampleLabel editor. */
export const EXAMPLE_LABEL_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.benefit-shortfall-correction.controls.exampleLabel.help",
    message: "Identify the scene as an illustrative case. 1..32 characters.",
  },
  path: "exampleLabel",
  kind: "text",
  minLength: 1,
  maxLength: 32,
  label: {
    id: "motionAtlas.benefit-shortfall-correction.controls.exampleLabel",
    message: "exampleLabel",
  },
};
