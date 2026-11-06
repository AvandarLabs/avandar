import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for languages. */
export const LANGUAGES_CONTROL: StockControl = {
  path: "languages",
  label: {
    id: "motionAtlas.interpreted-case-dialogue.controls.languages",
    message: "languages",
  },
  kind: "object",
  controls: [
    {
      path: "participant",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.languages.participant",
        message: "participant",
      },
      kind: "text",
      minLength: 0,
      maxLength: 22,
    },
    {
      path: "worker",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.languages.worker",
        message: "worker",
      },
      kind: "text",
      minLength: 0,
      maxLength: 22,
    },
  ],
  help: {
    id: "motionAtlas.interpreted-case-dialogue.controls.languages.help",
    message:
      "Label the two authored language versions without generating a translation. Each label <= 22 characters; defaults are explicitly fictional language labels.",
  },
};
