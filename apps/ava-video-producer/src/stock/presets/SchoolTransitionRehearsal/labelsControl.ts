import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for labels. */
export const LABELS_CONTROL: StockControl = {
  path: "labels",
  label: {
    id: "motionAtlas.school-transition-rehearsal.controls.labels",
    message: "labels",
  },
  kind: "object",
  controls: [
    {
      path: "setting",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.labels.setting",
        message: "setting",
      },
      kind: "text",
      minLength: 0,
      maxLength: 34,
    },
    {
      path: "practice",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.labels.practice",
        message: "practice",
      },
      kind: "text",
      minLength: 0,
      maxLength: 34,
    },
    {
      path: "choice",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.labels.choice",
        message: "choice",
      },
      kind: "text",
      minLength: 0,
      maxLength: 34,
    },
    {
      path: "example",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.labels.example",
        message: "example",
      },
      kind: "text",
      minLength: 0,
      maxLength: 34,
    },
  ],
  help: {
    id: "motionAtlas.school-transition-rehearsal.controls.labels.help",
    message:
      "Set the setting, rehearsal and learner-choice labels. Each label <= 34 characters; choice copy must match finalStepSupport.",
  },
};
