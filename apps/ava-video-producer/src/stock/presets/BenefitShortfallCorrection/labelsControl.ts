import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable labels editor. */
export const LABELS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.benefit-shortfall-correction.controls.labels.help",
    message:
      "Name the quantities and their distinct visual patterns. Each label <= 26 characters; arithmetic is derived from payment inputs.",
  },
  path: "labels",
  kind: "object",
  controls: [
    {
      path: "stated",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.labels.stated",
        message: "stated",
      },
    },
    {
      path: "received",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.labels.received",
        message: "received",
      },
    },
    {
      path: "correction",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.labels.correction",
        message: "correction",
      },
    },
    {
      path: "unresolved",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.labels.unresolved",
        message: "unresolved",
      },
    },
  ],
  label: {
    id: "motionAtlas.benefit-shortfall-correction.controls.labels",
    message: "labels",
  },
};
