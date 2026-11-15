import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./CoordinateFrameRegistration.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Exact numeric and mixed-type editing controls plus shared prose controls. */
export const controls: StockControl[] = [
  {
    path: "landmarks",
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: z.toJSONSchema(inputSchema.shape.landmarks.element),
    itemControls: [
      {
        path: "id",
        kind: "text",
        minLength: 0,
        maxLength: 12,
        label: {
          id: "motionAtlas.coordinate-frame-registration.controls.id",
          message: "id",
        },
      },
      {
        path: "label",
        kind: "text",
        minLength: 0,
        maxLength: 20,
        label: {
          id: "motionAtlas.coordinate-frame-registration.controls.label",
          message: "label",
        },
      },
      {
        path: "x",
        kind: "number",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.coordinate-frame-registration.controls.x",
          message: "x",
        },
      },
      {
        path: "y",
        kind: "number",
        min: 0,
        max: 100,
        label: {
          id: "motionAtlas.coordinate-frame-registration.controls.y",
          message: "y",
        },
      },
    ],
    label: {
      id: "motionAtlas.coordinate-frame-registration.controls.landmarks",
      message: "landmarks",
    },
  },
  {
    path: "transform",
    kind: "object",
    controls: [
      {
        path: "scaleX",
        kind: "number",
        min: 0.25,
        max: 2,
        label: {
          id: "motionAtlas.coordinate-frame-registration.controls.scaleX",
          message: "scaleX",
        },
      },
      {
        path: "scaleY",
        kind: "number",
        min: 0.25,
        max: 2,
        label: {
          id: "motionAtlas.coordinate-frame-registration.controls.scaleY",
          message: "scaleY",
        },
      },
      {
        path: "offsetX",
        kind: "number",
        min: -50,
        max: 50,
        label: {
          id: "motionAtlas.coordinate-frame-registration.controls.offsetX",
          message: "offsetX",
        },
      },
      {
        path: "offsetY",
        kind: "number",
        min: -50,
        max: 50,
        label: {
          id: "motionAtlas.coordinate-frame-registration.controls.offsetY",
          message: "offsetY",
        },
      },
    ],
    label: {
      id: "motionAtlas.coordinate-frame-registration.controls.transform",
      message: "transform",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({
        frames: inputSchema.shape.frames,
        showCoordinatePairs: inputSchema.shape.showCoordinatePairs,
        copy: inputSchema.shape.copy,
      }),
    ),
    messageNamespace: "motionAtlas.coordinate-frame-registration",
  }),
];
