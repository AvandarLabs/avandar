import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for people. */
export const PEOPLE_CONTROL: StockControl = {
  path: "people",
  label: {
    id: "motionAtlas.interpreted-case-dialogue.controls.people",
    message: "people",
  },
  kind: "object",
  controls: [
    {
      path: "participant",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.people.participant",
        message: "participant",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
    {
      path: "worker",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.people.worker",
        message: "worker",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
    {
      path: "interpreter",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.people.interpreter",
        message: "interpreter",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
  ],
  help: {
    id: "motionAtlas.interpreted-case-dialogue.controls.people.help",
    message:
      "Label the three conversational roles. Each label <= 24 characters; interpreter is distinct from participant and worker.",
  },
};
