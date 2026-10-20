import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./KernelDensitySpread.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit numeric controls and reviewed schema-driven prose controls. */
export const controls: StockControl[] = [
  {
    kind: "collection",
    path: "points",
    minItems: 2,
    maxItems: 5,
    itemSchema: z.toJSONSchema(inputSchema.shape.points.element),
    itemControls: [
      {
        kind: "text",
        path: "id",
        minLength: 1,
        maxLength: 12,
        label: {
          id: "motionAtlas.kernel-density-spread.control.id",
          message: "id",
        },
      },
      {
        kind: "number",
        path: "x",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.kernel-density-spread.control.x",
          message: "x",
        },
      },
      {
        kind: "number",
        path: "y",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.kernel-density-spread.control.y",
          message: "y",
        },
      },
      {
        kind: "number",
        path: "weight",
        help: {
          id: "motionAtlas.kernel-density-spread.control.weight.help",
          message:
            "Finite and greater than zero. The complete input is validated against the stated bounds.",
        },
        min: 0,
        max: 5,
        label: {
          id: "motionAtlas.kernel-density-spread.control.weight",
          message: "weight",
        },
      },
    ],
    label: {
      id: "motionAtlas.kernel-density-spread.control.points",
      message: "points",
    },
  },
  {
    kind: "object",
    path: "radii",
    label: {
      id: "motionAtlas.kernel-density-spread.control.radii",
      message: "Two smoothing radii in normalized grid units.",
    },
    controls: [
      {
        kind: "number",
        path: "initial",
        min: 5,
        max: 40,
        label: {
          id: "motionAtlas.kernel-density-spread.control.initial",
          message: "initial",
        },
      },
      {
        kind: "number",
        path: "final",
        min: 5,
        max: 40,
        label: {
          id: "motionAtlas.kernel-density-spread.control.final",
          message: "final",
        },
      },
    ],
  },
  {
    kind: "number",
    path: "gridSize",
    min: 6,
    max: 12,
    step: 1,
    label: {
      id: "motionAtlas.kernel-density-spread.control.gridSize",
      message: "gridSize",
    },
  },
  {
    kind: "number",
    path: "legendMaximum",
    help: {
      id: "motionAtlas.kernel-density-spread.control.legendMaximum.help",
      message:
        "At least the sum of all supplied point weights, with no automatic rescaling.",
    },
    min: 0,
    max: 25,
    label: {
      id: "motionAtlas.kernel-density-spread.control.legendMaximum",
      message: "legendMaximum",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({ labels: inputSchema.shape.labels }),
    ),
    messageNamespace: "motionAtlas.kernel-density-spread",
  }),
  {
    kind: "boolean",
    path: "showKernels",
    label: {
      id: "motionAtlas.kernel-density-spread.control.showKernels",
      message: "Retain faint kernel boundaries after combination.",
    },
  },
];
