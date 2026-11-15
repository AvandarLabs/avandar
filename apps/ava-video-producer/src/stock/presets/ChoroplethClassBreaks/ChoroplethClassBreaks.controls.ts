import { z } from "zod";
import { inputSchema } from "./ChoroplethClassBreaks.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit serializable controls retain the full accepted input domains. */
export const controls: StockControl[] = [
  {
    path: "zones",
    label: {
      id: "motionAtlas.choropleth-class-breaks.controls.zones",
      message: "zones",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.zones.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.choropleth-class-breaks.controls.zones.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.choropleth-class-breaks.controls.zones.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.choropleth-class-breaks.controls.zones.value",
          message: "value",
        },
        kind: "number",
        min: 0,
        max: 100,
        nullable: true,
      },
    ],
  },
  {
    path: "schemes",
    label: {
      id: "motionAtlas.choropleth-class-breaks.controls.schemes",
      message: "schemes",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: z.toJSONSchema(inputSchema.shape.schemes.element),
    itemControls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.choropleth-class-breaks.controls.schemes.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "breaks",
        label: {
          id: "motionAtlas.choropleth-class-breaks.controls.schemes.breaks",
          message: "breaks",
        },
        kind: "collection",
        minItems: 3,
        maxItems: 3,
        itemSchema: z.toJSONSchema(
          inputSchema.shape.schemes.element.shape.breaks.element,
        ),
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.choropleth-class-breaks.controls.schemes.breaks.value",
              message: "Value",
            },
            kind: "number",
            min: -1.7976931348623157e308,
            max: 1.7976931348623157e308,
          },
        ],
      },
    ],
  },
  {
    path: "unitLabel",
    label: {
      id: "motionAtlas.choropleth-class-breaks.controls.unitLabel",
      message: "unitLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 20,
  },
  {
    path: "noDataLabel",
    label: {
      id: "motionAtlas.choropleth-class-breaks.controls.noDataLabel",
      message: "noDataLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 26,
  },
  {
    path: "showValueRuler",
    label: {
      id: "motionAtlas.choropleth-class-breaks.controls.showValueRuler",
      message: "showValueRuler",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.choropleth-class-breaks.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "context",
        label: {
          id: "motionAtlas.choropleth-class-breaks.controls.copy.context",
          message: "context",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
      {
        path: "before",
        label: {
          id: "motionAtlas.choropleth-class-breaks.controls.copy.before",
          message: "before",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
      {
        path: "after",
        label: {
          id: "motionAtlas.choropleth-class-breaks.controls.copy.after",
          message: "after",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
    ],
  },
];
