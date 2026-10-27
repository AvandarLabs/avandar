import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable roomLabels editor. */
export const ROOM_LABELS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.private-case-conversation.controls.roomLabels.help",
    message:
      "Label the two physical spaces. Each label <= 26 characters; the floor plan is schematic, not a real facility.",
  },
  path: "roomLabels",
  kind: "object",
  controls: [
    {
      path: "meeting",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.private-case-conversation.controls.roomLabels.meeting",
        message: "meeting",
      },
    },
    {
      path: "waiting",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.private-case-conversation.controls.roomLabels.waiting",
        message: "waiting",
      },
    },
  ],
  label: {
    id: "motionAtlas.private-case-conversation.controls.roomLabels",
    message: "roomLabels",
  },
};
