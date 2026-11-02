import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for structure. */
export const STRUCTURE_CONTROL: StockControl = {
  path: "structure",
  label: {
    id: "motionAtlas.parcel-setback-inset.controls.structure",
    message: "structure",
  },
  kind: "object",
  controls: [
    {
      path: "label",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.structure.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 28,
    },
    {
      path: "width",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.structure.width",
        message: "width",
      },
      kind: "number",
      min: 2,
      max: 50,
    },
    {
      path: "height",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.structure.height",
        message: "height",
      },
      kind: "number",
      min: 2,
      max: 50,
    },
  ],
  help: {
    id: "motionAtlas.parcel-setback-inset.controls.structure.help",
    message:
      "The structure's complete rectangular ground footprint. Label <= 28 characters; width and height 2..50; no rotation or automatic resizing.",
  },
};
