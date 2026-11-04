import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./BoundedLocationDisplacement.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit numeric controls and reviewed schema-driven prose controls. */
export const controls: StockControl[] = [
  {
    kind: "collection",
    path: "locations",
    minItems: 1,
    maxItems: 3,
    itemSchema: z.toJSONSchema(inputSchema.shape.locations.element),
    itemControls: [
      {
        kind: "text",
        path: "id",
        minLength: 0,
        maxLength: 12,
        label: {
          id: "motionAtlas.bounded-location-displacement.control.id",
          message: "id",
        },
      },
      {
        kind: "text",
        path: "label",
        minLength: 0,
        maxLength: 20,
        label: {
          id: "motionAtlas.bounded-location-displacement.control.label",
          message: "label",
        },
      },
      {
        kind: "number",
        path: "x",
        min: 10,
        max: 90,
        label: {
          id: "motionAtlas.bounded-location-displacement.control.x",
          message: "x",
        },
      },
      {
        kind: "number",
        path: "y",
        min: 10,
        max: 90,
        label: {
          id: "motionAtlas.bounded-location-displacement.control.y",
          message: "y",
        },
      },
      {
        kind: "number",
        path: "offsetX",
        min: -20,
        max: 20,
        label: {
          id: "motionAtlas.bounded-location-displacement.control.offsetX",
          message: "offsetX",
        },
      },
      {
        kind: "number",
        path: "offsetY",
        min: -20,
        max: 20,
        label: {
          id: "motionAtlas.bounded-location-displacement.control.offsetY",
          message: "offsetY",
        },
      },
    ],
    label: {
      id: "motionAtlas.bounded-location-displacement.control.locations",
      message: "locations",
    },
  },
  {
    kind: "number",
    path: "radiusUnits",
    help: {
      id: "motionAtlas.bounded-location-displacement.control.radiusUnits.help",
      message:
        "Finite and greater than zero. The complete input is validated against the stated bounds.",
    },
    min: 0,
    max: 20,
    label: {
      id: "motionAtlas.bounded-location-displacement.control.radiusUnits",
      message: "radiusUnits",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({ labels: inputSchema.shape.labels }),
    ),
    messageNamespace: "motionAtlas.bounded-location-displacement",
  }),
  {
    kind: "boolean",
    path: "showLocalOriginal",
    label: {
      id: "motionAtlas.bounded-location-displacement.control.showLocalOriginal",
      message: "Show original position only inside the local inset.",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(z.strictObject({ copy: inputSchema.shape.copy })),
    messageNamespace: "motionAtlas.bounded-location-displacement",
  }),
];
