import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable closingNote editor. */
export const CLOSING_NOTE_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.resident-budget-ballots.controls.closingNote.help",
    message:
      "State the boundary between this count and later budget decisions. 1..46 characters; must not imply an automatic funding allocation.",
  },
  path: "closingNote",
  kind: "text",
  minLength: 1,
  maxLength: 46,
  label: {
    id: "motionAtlas.resident-budget-ballots.controls.closingNote",
    message: "closingNote",
  },
};
