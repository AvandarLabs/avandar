import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for parcels. */
export const PARCELS_CONTROL: StockControl = {
  path: "parcels",
  label: {
    id: "motionAtlas.parcel-setback-inset.controls.parcels",
    message: "parcels",
  },
  kind: "collection",
  minItems: 1,
  maxItems: 3,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 12,
      },
      label: {
        type: "string",
        maxLength: 20,
      },
      x: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      y: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      width: {
        type: "number",
        minimum: 5,
        maximum: 80,
      },
      height: {
        type: "number",
        minimum: 5,
        maximum: 80,
      },
    },
    required: ["id", "label", "x", "y", "width", "height"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.parcels.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.parcels.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 20,
    },
    {
      path: "x",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.parcels.x",
        message: "x",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "y",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.parcels.y",
        message: "y",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "width",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.parcels.width",
        message: "width",
      },
      kind: "number",
      min: 5,
      max: 80,
    },
    {
      path: "height",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.parcels.height",
        message: "height",
      },
      kind: "number",
      min: 5,
      max: 80,
    },
  ],
  help: {
    id: "motionAtlas.parcel-setback-inset.controls.parcels.help",
    message:
      "Rectangular parcels in a local schematic coordinate plane. 1..3 parcels; unique IDs <= 12 characters; labels <= 20 characters; dimensions 5..80; non-overlapping rectangles fully inside 0..100.",
  },
};
