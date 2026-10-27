import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable requestLabel editor. */
export const REQUEST_LABEL_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.private-case-conversation.controls.requestLabel.help",
    message: "Set the participant's privacy request. 1..40 characters.",
  },
  path: "requestLabel",
  kind: "text",
  minLength: 1,
  maxLength: 40,
  label: {
    id: "motionAtlas.private-case-conversation.controls.requestLabel",
    message: "requestLabel",
  },
};
