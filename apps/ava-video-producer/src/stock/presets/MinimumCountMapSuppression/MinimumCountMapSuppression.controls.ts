import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./MinimumCountMapSuppression.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Exact numeric and mixed-type editing controls plus shared prose controls. */
export const controls: StockControl[] = [
  {
    path: "cells",
    kind: "collection",
    minItems: 3,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.cells.element),
    itemControls: [
      {
        path: "id",
        kind: "text",
        minLength: 0,
        maxLength: 12,
        label: {
          id: "motionAtlas.minimum-count-map-suppression.controls.id",
          message: "id",
        },
      },
      {
        path: "label",
        kind: "text",
        minLength: 0,
        maxLength: 16,
        label: {
          id: "motionAtlas.minimum-count-map-suppression.controls.label",
          message: "label",
        },
      },
      {
        path: "count",
        kind: "number",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.minimum-count-map-suppression.controls.count",
          message: "count",
        },
        step: 1,
        nullable: true,
      },
    ],
    label: {
      id: "motionAtlas.minimum-count-map-suppression.controls.cells",
      message: "cells",
    },
  },
  {
    path: "minimum",
    kind: "number",
    min: 2,
    max: 20,
    label: {
      id: "motionAtlas.minimum-count-map-suppression.controls.minimum",
      message: "minimum",
    },
    step: 1,
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({
        labels: inputSchema.shape.labels,
        showLocalCounts: inputSchema.shape.showLocalCounts,
        copy: inputSchema.shape.copy,
      }),
    ),
    messageNamespace: "motionAtlas.minimum-count-map-suppression",
  }),
];
