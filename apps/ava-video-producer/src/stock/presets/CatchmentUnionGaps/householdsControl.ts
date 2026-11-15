import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for households. */
export const HOUSEHOLDS_CONTROL: StockControl = {
  path: "households",
  label: {
    id: "motionAtlas.catchment-union-gaps.controls.households",
    message: "households",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 12,
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
      members: {
        type: "integer",
        minimum: 1,
        maximum: 8,
      },
    },
    required: ["id", "label", "x", "y", "members"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.households.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.households.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 20,
    },
    {
      path: "x",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.households.x",
        message: "x",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "y",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.households.y",
        message: "y",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "members",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.households.members",
        message: "members",
      },
      kind: "number",
      min: 1,
      max: 8,
      step: 1,
    },
  ],
  help: {
    id: "motionAtlas.catchment-union-gaps.controls.households.help",
    message:
      "The complete illustrated household denominator. 2..12 unique households; IDs <= 12 characters; labels <= 20 characters; coordinates 0..100; members integer 1..8; no point on a catchment boundary.",
  },
};
