import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable labels editor. */
export const LABELS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.resident-budget-ballots.controls.labels.help",
    message:
      "Set the display, box, tally and abstention headings. Each label <= 32 characters.",
  },
  path: "labels",
  kind: "object",
  controls: [
    {
      path: "choices",
      kind: "text",
      minLength: 0,
      maxLength: 32,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.labels.choices",
        message: "choices",
      },
    },
    {
      path: "box",
      kind: "text",
      minLength: 0,
      maxLength: 32,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.labels.box",
        message: "box",
      },
    },
    {
      path: "tally",
      kind: "text",
      minLength: 0,
      maxLength: 32,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.labels.tally",
        message: "tally",
      },
    },
    {
      path: "abstained",
      kind: "text",
      minLength: 0,
      maxLength: 32,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.labels.abstained",
        message: "abstained",
      },
    },
    {
      path: "unit",
      kind: "text",
      minLength: 0,
      maxLength: 32,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.labels.unit",
        message: "unit",
      },
    },
    {
      path: "example",
      kind: "text",
      minLength: 0,
      maxLength: 32,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.labels.example",
        message: "example",
      },
    },
  ],
  label: {
    id: "motionAtlas.resident-budget-ballots.controls.labels",
    message: "labels",
  },
};
