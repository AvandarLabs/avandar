import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./DistanceBufferEnvelope.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit numeric controls and reviewed schema-driven prose controls. */
export const controls: StockControl[] = [
  {
    kind: "object",
    path: "origin",
    label: {
      id: "motionAtlas.distance-buffer-envelope.control.origin",
      message: "The buffer center in a local schematic plane.",
    },
    controls: [
      {
        kind: "text",
        path: "label",
        minLength: 1,
        maxLength: 24,
        label: {
          id: "motionAtlas.distance-buffer-envelope.control.label",
          message: "label",
        },
      },
      {
        kind: "number",
        path: "x",
        min: 20,
        max: 80,
        label: {
          id: "motionAtlas.distance-buffer-envelope.control.x",
          message: "x",
        },
      },
      {
        kind: "number",
        path: "y",
        min: 20,
        max: 80,
        label: {
          id: "motionAtlas.distance-buffer-envelope.control.y",
          message: "y",
        },
      },
    ],
  },
  {
    kind: "collection",
    path: "locations",
    minItems: 2,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.locations.element),
    itemControls: [
      {
        kind: "text",
        path: "id",
        minLength: 1,
        maxLength: 12,
        label: {
          id: "motionAtlas.distance-buffer-envelope.control.id",
          message: "id",
        },
      },
      {
        kind: "text",
        path: "label",
        minLength: 0,
        maxLength: 20,
        label: {
          id: "motionAtlas.distance-buffer-envelope.control.label",
          message: "label",
        },
      },
      {
        kind: "number",
        path: "x",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.distance-buffer-envelope.control.x",
          message: "x",
        },
      },
      {
        kind: "number",
        path: "y",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.distance-buffer-envelope.control.y",
          message: "y",
        },
      },
    ],
    label: {
      id: "motionAtlas.distance-buffer-envelope.control.locations",
      message: "locations",
    },
  },
  {
    kind: "number",
    path: "radiusUnits",
    help: {
      id: "motionAtlas.distance-buffer-envelope.control.radiusUnits.help",
      message:
        "Finite and greater than zero. The complete input is validated against the stated bounds.",
    },
    min: 0,
    max: 40,
    label: {
      id: "motionAtlas.distance-buffer-envelope.control.radiusUnits",
      message: "radiusUnits",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({ labels: inputSchema.shape.labels }),
    ),
    messageNamespace: "motionAtlas.distance-buffer-envelope",
  }),
  {
    kind: "boolean",
    path: "showDistances",
    label: {
      id: "motionAtlas.distance-buffer-envelope.control.showDistances",
      message: "Show origin-to-location rulers and values.",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(z.strictObject({ copy: inputSchema.shape.copy })),
    messageNamespace: "motionAtlas.distance-buffer-envelope",
  }),
];
