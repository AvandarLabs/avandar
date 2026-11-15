import { z } from "zod";
import { inputSchema } from "./ProportionalSymbolArea.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit serializable controls retain the full accepted input domains. */
export const controls: StockControl[] = [
  {
    path: "sites",
    label: {
      id: "motionAtlas.proportional-symbol-area.controls.sites",
      message: "sites",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: z.toJSONSchema(inputSchema.shape.sites.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.proportional-symbol-area.controls.sites.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.proportional-symbol-area.controls.sites.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "x",
        label: {
          id: "motionAtlas.proportional-symbol-area.controls.sites.x",
          message: "x",
        },
        kind: "number",
        min: 0,
        max: 100,
      },
      {
        path: "y",
        label: {
          id: "motionAtlas.proportional-symbol-area.controls.sites.y",
          message: "y",
        },
        kind: "number",
        min: 0,
        max: 100,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.proportional-symbol-area.controls.sites.value",
          message: "value",
        },
        kind: "number",
        min: 1,
        max: 9,
        step: 1,
      },
    ],
  },
  {
    path: "areaPerUnit",
    label: {
      id: "motionAtlas.proportional-symbol-area.controls.areaPerUnit",
      message: "areaPerUnit",
    },
    kind: "number",
    min: 100,
    max: 900,
  },
  {
    path: "unitLabel",
    label: {
      id: "motionAtlas.proportional-symbol-area.controls.unitLabel",
      message: "unitLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 16,
  },
  {
    path: "showRadiusComparison",
    label: {
      id: "motionAtlas.proportional-symbol-area.controls.showRadiusComparison",
      message: "showRadiusComparison",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.proportional-symbol-area.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "context",
        label: {
          id: "motionAtlas.proportional-symbol-area.controls.copy.context",
          message: "context",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
      {
        path: "before",
        label: {
          id: "motionAtlas.proportional-symbol-area.controls.copy.before",
          message: "before",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
      {
        path: "after",
        label: {
          id: "motionAtlas.proportional-symbol-area.controls.copy.after",
          message: "after",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
    ],
  },
];
