import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for catchments. */
export const CATCHMENTS_CONTROL: StockControl = {
  path: "catchments",
  label: {
    id: "motionAtlas.catchment-union-gaps.controls.catchments",
    message: "catchments",
  },
  kind: "collection",
  minItems: 1,
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
        maxLength: 28,
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
        id: "motionAtlas.catchment-union-gaps.controls.catchments.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.catchments.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 28,
    },
    {
      path: "polygon",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.catchments.polygon",
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
            id: "motionAtlas.catchment-union-gaps.controls.catchments.polygon.item",
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
                id: "motionAtlas.catchment-union-gaps.controls.catchments.polygon.item.item",
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
    id: "motionAtlas.catchment-union-gaps.controls.catchments.help",
    message:
      "Supplied coverage polygons, with no routing or travel-time calculation. 1..4 catchments; unique IDs <= 12 characters; labels <= 28 characters; 3..8 vertices per simple polygon; coordinates 0..100.",
  },
};
