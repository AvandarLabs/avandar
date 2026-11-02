import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for labels. */
export const LABELS_CONTROL: StockControl = {
  path: "labels",
  label: {
    id: "motionAtlas.interpreted-case-dialogue.controls.labels",
    message: "labels",
  },
  kind: "object",
  controls: [
    {
      path: "original",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.labels.original",
        message: "original",
      },
      kind: "text",
      minLength: 0,
      maxLength: 38,
    },
    {
      path: "interpreted",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.labels.interpreted",
        message: "interpreted",
      },
      kind: "text",
      minLength: 0,
      maxLength: 38,
    },
    {
      path: "example",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.labels.example",
        message: "example",
      },
      kind: "text",
      minLength: 0,
      maxLength: 38,
    },
  ],
  help: {
    id: "motionAtlas.interpreted-case-dialogue.controls.labels.help",
    message:
      "Set the attribution key and example caption. Each label <= 38 characters.",
  },
};
