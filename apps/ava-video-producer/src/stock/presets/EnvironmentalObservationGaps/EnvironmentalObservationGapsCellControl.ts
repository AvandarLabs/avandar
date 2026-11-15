import type { StockControl } from "../../contracts/StockContract.types";
/** Literal bounds and editor controls for the observation grid cells. */
export const CELL_CONTROL: StockControl = {
  path: "cells",
  label: {
    id: "motionAtlas.environmental-observation-gaps.controls.cells",
    message: "cells",
  },
  kind: "collection",
  minItems: 4,
  maxItems: 12,
  itemSchema: {
    type: "object",
    properties: {
      id: { type: "string", minLength: 0, maxLength: 20 },
      label: { type: "string", minLength: 0, maxLength: 16 },
      column: { type: "integer", minimum: 0, maximum: 3 },
      row: { type: "integer", minimum: 0, maximum: 2 },
      value: {
        anyOf: [
          {
            type: "number",
            minimum: -1.7976931348623157e308,
            maximum: 1.7976931348623157e308,
          },
          { type: "null" },
        ],
      },
    },
    required: ["id", "label", "column", "row", "value"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.environmental-observation-gaps.controls.cells.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 20,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.environmental-observation-gaps.controls.cells.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "column",
      label: {
        id: "motionAtlas.environmental-observation-gaps.controls.cells.column",
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
        id: "motionAtlas.environmental-observation-gaps.controls.cells.row",
        message: "row",
      },
      kind: "number",
      min: 0,
      max: 2,
      step: 1,
    },
    {
      path: "value",
      label: {
        id: "motionAtlas.environmental-observation-gaps.controls.cells.value",
        message: "value",
      },
      kind: "number",
      min: -1.7976931348623157e308,
      max: 1.7976931348623157e308,
      nullable: true,
    },
  ],
  help: {
    id: "motionAtlas.environmental-observation-gaps.controls.cells.help",
    message:
      "Define the schematic tile observations; null is an explicit missing area observation. 4..12 cells; unique IDs <= 20 characters; labels <= 16; integer rows 0..2 and columns 0..3; unique coordinates forming a filled rectangle. Values finite within metric bounds or null. Array determines grid dimensions.",
  },
};
