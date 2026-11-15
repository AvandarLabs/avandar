import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for cells. */
export const CELLS_CONTROL: StockControl = {
  path: "cells",
  label: {
    id: "motionAtlas.boundary-regrouping-effect.controls.cells",
    message: "cells",
  },
  kind: "collection",
  minItems: 4,
  maxItems: 9,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 12,
      },
      label: {
        type: "string",
        maxLength: 16,
      },
      column: {
        type: "integer",
        minimum: 0,
        maximum: 2,
      },
      row: {
        type: "integer",
        minimum: 0,
        maximum: 2,
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
    required: ["id", "label", "column", "row", "records", "population"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.cells.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.cells.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "column",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.cells.column",
        message: "column",
      },
      kind: "number",
      min: 0,
      max: 2,
      step: 1,
    },
    {
      path: "row",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.cells.row",
        message: "row",
      },
      kind: "number",
      min: 0,
      max: 2,
      step: 1,
    },
    {
      path: "records",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.cells.records",
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
        id: "motionAtlas.boundary-regrouping-effect.controls.cells.population",
        message: "population",
      },
      kind: "number",
      min: 1,
      max: 1000,
      step: 1,
    },
  ],
  help: {
    id: "motionAtlas.boundary-regrouping-effect.controls.cells.help",
    message:
      "Unchanging atomic geographic cells and their quantities. 4..9 cells; unique IDs <= 12 characters and grid positions; labels <= 16 characters; row and column integers 0..2; records integer 0..100; population integer 1..1000; records <= population.",
  },
};
