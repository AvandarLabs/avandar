import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for floorTiles. */
export const FLOOR_TILES_CONTROL: StockControl = {
  path: "floorTiles",
  label: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles",
    message: "floorTiles",
  },
  kind: "collection",
  minItems: 4,
  maxItems: 12,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 12,
      },
      column: {
        type: "integer",
        minimum: 0,
        maximum: 3,
      },
      row: {
        type: "integer",
        minimum: 0,
        maximum: 2,
      },
      role: {
        enum: ["sleeping", "circulation", "storage", "closed"],
      },
    },
    required: ["id", "column", "row", "role"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "column",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.column",
        message: "column",
      },
      kind: "number",
      min: 0,
      max: 3,
      step: 1,
    },
    {
      path: "row",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.row",
        message: "row",
      },
      kind: "number",
      min: 0,
      max: 2,
      step: 1,
    },
    {
      path: "role",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.role",
        message: "role",
      },
      kind: "select",
      options: [
        {
          value: "sleeping",
          label: {
            id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.role.sleeping",
            message: "sleeping",
          },
        },
        {
          value: "circulation",
          label: {
            id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.role.circulation",
            message: "circulation",
          },
        },
        {
          value: "storage",
          label: {
            id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.role.storage",
            message: "storage",
          },
        },
        {
          value: "closed",
          label: {
            id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.role.closed",
            message: "closed",
          },
        },
      ],
    },
  ],
  help: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.floorTiles.help",
    message:
      "Equal-area floor tiles with mutually exclusive uses. 4..12 tiles; unique IDs <= 12 characters and grid positions; row integer 0..2; column integer 0..3; contiguous footprint; each tile has exactly one listed role.",
  },
};
