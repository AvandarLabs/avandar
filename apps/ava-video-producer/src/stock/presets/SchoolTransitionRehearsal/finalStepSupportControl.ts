import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for finalStepSupport. */
export const FINAL_STEP_SUPPORT_CONTROL: StockControl = {
  path: "finalStepSupport",
  label: {
    id: "motionAtlas.school-transition-rehearsal.controls.finalStepSupport",
    message: "finalStepSupport",
  },
  kind: "select",
  options: [
    {
      value: "alongside",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.finalStepSupport.0",
        message: "alongside",
      },
    },
    {
      value: "stands-back",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.finalStepSupport.1",
        message: "stands-back",
      },
    },
  ],
  help: {
    id: "motionAtlas.school-transition-rehearsal.controls.finalStepSupport.help",
    message:
      "Show the learner's authored preference for the final practice step. Alongside or stands-back; no automatic progression toward independence is inferred.",
  },
};
