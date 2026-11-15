import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for people. */
export const PEOPLE_CONTROL: StockControl = {
  path: "people",
  label: {
    id: "motionAtlas.school-transition-rehearsal.controls.people",
    message: "people",
  },
  kind: "object",
  controls: [
    {
      path: "learner",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.people.learner",
        message: "learner",
      },
      kind: "text",
      minLength: 0,
      maxLength: 26,
    },
    {
      path: "companion",
      label: {
        id: "motionAtlas.school-transition-rehearsal.controls.people.companion",
        message: "companion",
      },
      kind: "text",
      minLength: 0,
      maxLength: 26,
    },
  ],
  help: {
    id: "motionAtlas.school-transition-rehearsal.controls.people.help",
    message:
      "Label the learner and the person supporting the practice. Each label <= 26 characters; roles do not imply an age, disability or family relationship.",
  },
};
