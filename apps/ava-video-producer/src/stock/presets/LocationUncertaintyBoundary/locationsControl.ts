import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for locations. */
export const LOCATIONS_CONTROL: StockControl = {
  path: "locations",
  label: {
    id: "motionAtlas.location-uncertainty-boundary.controls.locations",
    message: "locations",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 6,
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
      radius: {
        type: "number",
        minimum: 0,
        maximum: 15,
      },
    },
    required: ["id", "label", "x", "y", "radius"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.locations.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.locations.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 20,
    },
    {
      path: "x",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.locations.x",
        message: "x",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "y",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.locations.y",
        message: "y",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "radius",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.locations.radius",
        message: "radius",
      },
      kind: "number",
      min: 0,
      max: 15,
    },
  ],
  help: {
    id: "motionAtlas.location-uncertainty-boundary.controls.locations.help",
    message:
      "Nominal locations and authored possible-position radii. 2..6 records; unique IDs <= 12 characters; labels <= 20 characters; coordinates 0..100; radius 0..15; entire footprints inside map extent; radii are supplied bounds, not probability distributions.",
  },
};
