import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for observation. */
export const OBSERVATION_CONTROL: StockControl = {
  path: "observation",
  label: {
    id: "motionAtlas.public-works-measurement-check.controls.observation",
    message: "observation",
  },
  kind: "object",
  controls: [
    {
      path: "label",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.observation.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 30,
    },
    {
      path: "length",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.observation.length",
        message: "length",
      },
      kind: "number",
      min: 1,
      max: 8,
    },
    {
      path: "sourceLabel",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.observation.sourceLabel",
        message: "sourceLabel",
      },
      kind: "text",
      minLength: 0,
      maxLength: 30,
    },
  ],
  help: {
    id: "motionAtlas.public-works-measurement-check.controls.observation.help",
    message:
      "Set the observed length and the supplied evidence label. Label/source <= 30 characters; length finite 1..8; no measurement is inferred from a real image.",
  },
};
