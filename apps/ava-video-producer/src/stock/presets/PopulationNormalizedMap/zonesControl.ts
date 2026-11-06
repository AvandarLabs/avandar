import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for zones. */
export const ZONES_CONTROL: StockControl = {
  path: "zones",
  label: {
    id: "motionAtlas.population-normalized-map.controls.zones",
    message: "zones",
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
      records: {
        type: "integer",
        minimum: 0,
        maximum: 100,
      },
      population: {
        type: "integer",
        minimum: 1,
        maximum: 1000,
      },
    },
    required: ["id", "label", "polygon", "records", "population"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.population-normalized-map.controls.zones.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.population-normalized-map.controls.zones.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
    {
      path: "polygon",
      label: {
        id: "motionAtlas.population-normalized-map.controls.zones.polygon",
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
            id: "motionAtlas.population-normalized-map.controls.zones.polygon.item",
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
                id: "motionAtlas.population-normalized-map.controls.zones.polygon.item.item",
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
    {
      path: "records",
      label: {
        id: "motionAtlas.population-normalized-map.controls.zones.records",
        message: "records",
      },
      kind: "number",
      min: 0,
      max: 100,
      step: 1,
    },
    {
      path: "population",
      label: {
        id: "motionAtlas.population-normalized-map.controls.zones.population",
        message: "population",
      },
      kind: "number",
      min: 1,
      max: 1000,
      step: 1,
    },
  ],
  help: {
    id: "motionAtlas.population-normalized-map.controls.zones.help",
    message:
      "Stable zones with supplied record counts and population denominators. 2..4 disjoint zones; unique IDs <= 12 characters; labels <= 24 characters; 3..8 simple-polygon vertices at 0..100; records integer 0..100; population integer 1..1000; records <= population for this unique-record contract.",
  },
};
