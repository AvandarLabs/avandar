import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for districts. */
export const DISTRICTS_CONTROL: StockControl = {
  path: "districts",
  label: {
    id: "motionAtlas.location-uncertainty-boundary.controls.districts",
    message: "districts",
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
        type: "array",
        items: {
          type: "array",
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
          minItems: 2,
          maxItems: 2,
        },
        minItems: 3,
        maxItems: 8,
      },
    },
    required: ["id", "label", "polygon"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.districts.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.districts.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
    {
      path: "polygon",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.districts.polygon",
        message: "polygon",
      },
      kind: "collection",
      minItems: 3,
      maxItems: 8,
      itemSchema: {
        type: "array",
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
        minItems: 2,
        maxItems: 2,
      },
      itemControls: [
        {
          path: "",
          label: {
            id: "motionAtlas.location-uncertainty-boundary.controls.districts.polygon.item",
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
                id: "motionAtlas.location-uncertainty-boundary.controls.districts.polygon.item.item",
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
    id: "motionAtlas.location-uncertainty-boundary.controls.districts.help",
    message:
      "Non-overlapping schematic assignment districts. 2..4 districts; unique IDs <= 12 characters; labels <= 24 characters; 3..8 vertices per simple polygon; coordinates 0..100; interiors disjoint.",
  },
};
