import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./CoordinateQualityTriage.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Exact numeric and mixed-type editing controls plus shared prose controls. */
export const controls: StockControl[] = [
  {
    path: "rows",
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.rows.element),
    itemControls: [
      {
        path: "id",
        kind: "text",
        minLength: 0,
        maxLength: 12,
        label: {
          id: "motionAtlas.coordinate-quality-triage.controls.id",
          message: "id",
        },
      },
      {
        path: "latitude",
        kind: "union",
        nullable: true,
        label: {
          id: "motionAtlas.coordinate-quality-triage.controls.latitude",
          message: "latitude",
        },
        variants: [
          {
            valueType: "number",
            label: {
              id: "motionAtlas.coordinate-quality-triage.controls.numeric",
              message: "Numeric literal",
            },
            control: {
              path: "",
              kind: "number",
              min: -360,
              max: 360,
              label: {
                id: "motionAtlas.coordinate-quality-triage.controls.latitude.value",
                message: "Latitude value",
              },
            },
          },
          {
            valueType: "string",
            label: {
              id: "motionAtlas.coordinate-quality-triage.controls.text",
              message: "Text literal",
            },
            control: {
              path: "",
              kind: "text",
              minLength: 0,
              maxLength: 10,
              label: {
                id: "motionAtlas.coordinate-quality-triage.controls.latitude.value",
                message: "Latitude value",
              },
            },
          },
        ],
      },
      {
        path: "longitude",
        kind: "union",
        nullable: true,
        label: {
          id: "motionAtlas.coordinate-quality-triage.controls.longitude",
          message: "longitude",
        },
        variants: [
          {
            valueType: "number",
            label: {
              id: "motionAtlas.coordinate-quality-triage.controls.numeric",
              message: "Numeric literal",
            },
            control: {
              path: "",
              kind: "number",
              min: -360,
              max: 360,
              label: {
                id: "motionAtlas.coordinate-quality-triage.controls.longitude.value",
                message: "Longitude value",
              },
            },
          },
          {
            valueType: "string",
            label: {
              id: "motionAtlas.coordinate-quality-triage.controls.text",
              message: "Text literal",
            },
            control: {
              path: "",
              kind: "text",
              minLength: 0,
              maxLength: 10,
              label: {
                id: "motionAtlas.coordinate-quality-triage.controls.longitude.value",
                message: "Longitude value",
              },
            },
          },
        ],
      },
    ],
    label: {
      id: "motionAtlas.coordinate-quality-triage.controls.rows",
      message: "rows",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({
        labels: inputSchema.shape.labels,
        showValues: inputSchema.shape.showValues,
        copy: inputSchema.shape.copy,
      }),
    ),
    messageNamespace: "motionAtlas.coordinate-quality-triage",
  }),
];
