import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showPracticeStrip. */
export const SHOW_PRACTICE_STRIP_CONTROL: StockControl = {
  path: "showPracticeStrip",
  label: {
    id: "motionAtlas.school-transition-rehearsal.controls.showPracticeStrip",
    message: "showPracticeStrip",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.school-transition-rehearsal.controls.showPracticeStrip.help",
    message:
      "Keep the two supplied practice actions visible as a small strip the learner holds. Boolean; the strip is not an attendance record.",
  },
};
