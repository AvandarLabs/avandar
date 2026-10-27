import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable showWaitingSupporter editor. */
export const SHOW_WAITING_SUPPORTER_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.private-case-conversation.controls.showWaitingSupporter.help",
    message:
      "Keep the supporter visible in the separate waiting area. Boolean; false hides the waiting inset, never implies the person has been dismissed permanently.",
  },
  path: "showWaitingSupporter",
  kind: "boolean",
  label: {
    id: "motionAtlas.private-case-conversation.controls.showWaitingSupporter",
    message: "showWaitingSupporter",
  },
};
