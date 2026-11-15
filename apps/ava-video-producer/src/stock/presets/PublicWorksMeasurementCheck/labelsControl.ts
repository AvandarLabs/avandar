import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for labels. */
export const LABELS_CONTROL: StockControl = {
  path: "labels",
  label: {
    id: "motionAtlas.public-works-measurement-check.controls.labels",
    message: "labels",
  },
  kind: "object",
  controls: [
    {
      path: "specification",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.labels.specification",
        message: "specification",
      },
      kind: "text",
      minLength: 0,
      maxLength: 32,
    },
    {
      path: "observation",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.labels.observation",
        message: "observation",
      },
      kind: "text",
      minLength: 0,
      maxLength: 32,
    },
    {
      path: "difference",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.labels.difference",
        message: "difference",
      },
      kind: "text",
      minLength: 0,
      maxLength: 32,
    },
    {
      path: "example",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.labels.example",
        message: "example",
      },
      kind: "text",
      minLength: 0,
      maxLength: 32,
    },
  ],
  help: {
    id: "motionAtlas.public-works-measurement-check.controls.labels.help",
    message:
      "Set the measurement annotations and example caption. Each label <= 32 characters.",
  },
};
