import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showSightlines. */
export const SHOW_SIGHTLINES_CONTROL: StockControl = {
  path: "showSightlines",
  label: {
    id: "motionAtlas.interpreted-case-dialogue.controls.showSightlines",
    message: "showSightlines",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.interpreted-case-dialogue.controls.showSightlines.help",
    message:
      "Use subtle gaze guides to keep the participant and worker facing one another. Boolean; guides depict conversational orientation, not surveillance or measured attention.",
  },
};
