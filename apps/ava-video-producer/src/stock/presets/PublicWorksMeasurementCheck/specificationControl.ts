import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for specification. */
export const SPECIFICATION_CONTROL: StockControl = {
  path: "specification",
  label: {
    id: "motionAtlas.public-works-measurement-check.controls.specification",
    message: "specification",
  },
  kind: "object",
  controls: [
    {
      path: "label",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.specification.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 28,
    },
    {
      path: "length",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.specification.length",
        message: "length",
      },
      kind: "number",
      min: 1,
      max: 8,
    },
    {
      path: "unit",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.specification.unit",
        message: "unit",
      },
      kind: "text",
      minLength: 0,
      maxLength: 18,
    },
  ],
  help: {
    id: "motionAtlas.public-works-measurement-check.controls.specification.help",
    message:
      "Set the promised length and common measurement unit. Label <= 28 characters; length finite 1..8; unit <= 18 characters; both lengths use this unit.",
  },
};
