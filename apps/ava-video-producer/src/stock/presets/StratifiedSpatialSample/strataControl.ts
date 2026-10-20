import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for strata. */
export const STRATA_CONTROL: StockControl = {
  path: "strata",
  label: {
    id: "motionAtlas.stratified-spatial-sample.controls.strata",
    message: "strata",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 4,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 12,
      },
      label: {
        type: "string",
        maxLength: 24,
      },
      polygon: {
        minItems: 3,
        maxItems: 8,
        type: "array",
        items: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          prefixItems: [
            {
              type: "number",
              minimum: 0,
              maximum: 100,
            },
            {
              type: "number",
              minimum: 0,
              maximum: 100,
            },
          ],
        },
      },
    },
    required: ["id", "label", "polygon"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.strata.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.strata.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
    {
      path: "polygon",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.strata.polygon",
        message: "polygon",
      },
      kind: "collection",
      minItems: 3,
      maxItems: 8,
      itemSchema: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        prefixItems: [
          {
            type: "number",
            minimum: 0,
            maximum: 100,
          },
          {
            type: "number",
            minimum: 0,
            maximum: 100,
          },
        ],
      },
      itemControls: [
        {
          path: "",
          label: {
            id: "motionAtlas.stratified-spatial-sample.controls.strata.polygon.item",
            message: "Coordinate",
          },
          kind: "collection",
          minItems: 2,
          maxItems: 2,
          itemSchema: {
            type: "number",
            minimum: 0,
            maximum: 100,
          },
          itemControls: [
            {
              path: "",
              label: {
                id: "motionAtlas.stratified-spatial-sample.controls.strata.polygon.item.item",
                message: "Coordinate",
              },
              kind: "number",
              min: 0,
              max: 100,
            },
          ],
        },
      ],
    },
  ],
  help: {
    id: "motionAtlas.stratified-spatial-sample.controls.strata.help",
    message:
      "Non-overlapping schematic sampling strata. 2..4 strata; unique IDs <= 12 characters; labels <= 24 characters; 3..8 vertices per simple polygon; coordinates 0..100; interiors do not overlap.",
  },
};
