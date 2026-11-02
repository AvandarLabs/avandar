import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for bubbleLayout. */
export const BUBBLE_LAYOUT_CONTROL: StockControl = {
  path: "bubbleLayout",
  label: {
    id: "motionAtlas.interpreted-case-dialogue.controls.bubbleLayout",
    message: "bubbleLayout",
  },
  kind: "select",
  options: [
    {
      value: "paired",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.bubbleLayout.0",
        message: "paired",
      },
    },
    {
      value: "stacked",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.bubbleLayout.1",
        message: "stacked",
      },
    },
  ],
  help: {
    id: "motionAtlas.interpreted-case-dialogue.controls.bubbleLayout.help",
    message:
      "Arrange each original and interpreted wording while preserving speaker attribution. Paired or stacked; the interpreter never becomes the attributed author of the participant's statement.",
  },
};
