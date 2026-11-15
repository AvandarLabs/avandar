import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable people editor. */
export const PEOPLE_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.benefit-shortfall-correction.controls.people.help",
    message:
      "Label the person checking the payment and the worker responding. Each label <= 26 characters.",
  },
  path: "people",
  kind: "object",
  controls: [
    {
      path: "participant",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.people.participant",
        message: "participant",
      },
    },
    {
      path: "worker",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.benefit-shortfall-correction.controls.people.worker",
        message: "worker",
      },
    },
  ],
  label: {
    id: "motionAtlas.benefit-shortfall-correction.controls.people",
    message: "people",
  },
};
