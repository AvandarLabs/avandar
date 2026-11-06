import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./SpatialGridBinning.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Exact numeric and mixed-type editing controls plus shared prose controls. */
export const controls: StockControl[] = [
  {
    path: "points",
    kind: "collection",
    minItems: 1,
    maxItems: 12,
    itemSchema: z.toJSONSchema(inputSchema.shape.points.element),
    itemControls: [
      {
        path: "id",
        kind: "text",
        minLength: 0,
        maxLength: 12,
        label: {
          id: "motionAtlas.spatial-grid-binning.controls.id",
          message: "id",
        },
      },
      {
        path: "x",
        kind: "number",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.spatial-grid-binning.controls.x",
          message: "x",
        },
      },
      {
        path: "y",
        kind: "number",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.spatial-grid-binning.controls.y",
          message: "y",
        },
      },
    ],
    label: {
      id: "motionAtlas.spatial-grid-binning.controls.points",
      message: "points",
    },
  },
  {
    path: "grid",
    kind: "object",
    controls: [
      {
        path: "columns",
        kind: "number",
        min: 2,
        max: 3,
        label: {
          id: "motionAtlas.spatial-grid-binning.controls.columns",
          message: "columns",
        },
        step: 1,
      },
      {
        path: "rows",
        kind: "number",
        min: 2,
        max: 3,
        label: {
          id: "motionAtlas.spatial-grid-binning.controls.rows",
          message: "rows",
        },
        step: 1,
      },
    ],
    label: {
      id: "motionAtlas.spatial-grid-binning.controls.grid",
      message: "grid",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({
        labels: inputSchema.shape.labels,
        showPointGhosts: inputSchema.shape.showPointGhosts,
        copy: inputSchema.shape.copy,
      }),
    ),
    messageNamespace: "motionAtlas.spatial-grid-binning",
  }),
];
