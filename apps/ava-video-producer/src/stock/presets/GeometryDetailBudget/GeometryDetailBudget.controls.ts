import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { makeStockJsonSchemaFromZodSchema } from "../../contracts/makeStockJsonSchemaFromZodSchema/makeStockJsonSchemaFromZodSchema";
import { inputSchema } from "./GeometryDetailBudget.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Exact numeric and mixed-type editing controls plus shared prose controls. */
export const controls: StockControl[] = [
  {
    path: "vertices",
    kind: "collection",
    minItems: 3,
    maxItems: 8,
    itemSchema: makeStockJsonSchemaFromZodSchema(
      inputSchema.shape.vertices.element,
    ),
    itemControls: [
      {
        path: "0",
        kind: "number",
        min: 5,
        max: 95,
        label: {
          id: "motionAtlas.geometry-detail-budget.controls.0",
          message: "0",
        },
      },
      {
        path: "1",
        kind: "number",
        min: 5,
        max: 95,
        label: {
          id: "motionAtlas.geometry-detail-budget.controls.1",
          message: "1",
        },
      },
    ],
    label: {
      id: "motionAtlas.geometry-detail-budget.controls.vertices",
      message: "vertices",
    },
  },
  {
    path: "tolerance",
    kind: "number",
    min: 0,
    max: 30,
    label: {
      id: "motionAtlas.geometry-detail-budget.controls.tolerance",
      message: "tolerance",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({
        labels: inputSchema.shape.labels,
        showDeviationGuides: inputSchema.shape.showDeviationGuides,
        copy: inputSchema.shape.copy,
      }),
    ),
    messageNamespace: "motionAtlas.geometry-detail-budget",
  }),
];
