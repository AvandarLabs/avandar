import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors preserve authored field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "layers",
    label: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.layers",
      message: "layers",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 0, maxLength: 12 },
        label: { type: "string", minLength: 0, maxLength: 28 },
        polygon: {
          type: "array",
          items: {
            type: "array",
            prefixItems: [
              { type: "number", minimum: 0, maximum: 100 },
              { type: "number", minimum: 0, maximum: 100 },
            ],
            minItems: 2,
            maxItems: 2,
          },
          minItems: 3,
          maxItems: 8,
        },
      },
      required: ["id", "label", "polygon"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.layers.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.layers.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "polygon",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.layers.polygon",
          message: "polygon",
        },
        kind: "collection",
        minItems: 3,
        maxItems: 8,
        itemSchema: {
          type: "array",
          prefixItems: [
            { type: "number", minimum: 0, maximum: 100 },
            { type: "number", minimum: 0, maximum: 100 },
          ],
          minItems: 2,
          maxItems: 2,
        },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.gis-layer-intersection-tally.controls.layers.polygon.item",
              message: "Coordinate",
            },
            kind: "collection",
            minItems: 2,
            maxItems: 2,
            itemSchema: { type: "number", minimum: 0, maximum: 100 },
            itemControls: [
              {
                path: "",
                label: {
                  id: "motionAtlas.gis-layer-intersection-tally.controls.coordinate",
                  message: "Coordinate",
                },
                kind: "number",
                min: 0,
                max: 100,
              },
            ],
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.layers.help",
      message:
        "The two schematic surfaces being combined. Exactly 2 layers; unique IDs <= 12 characters; labels <= 28 characters; 3..8 vertices per simple polygon; coordinates 0..100.",
    },
  },
  {
    path: "households",
    label: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.households",
      message: "households",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 12,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 0, maxLength: 12 },
        label: { type: "string", minLength: 0, maxLength: 20 },
        x: { type: "number", minimum: 0, maximum: 100 },
        y: { type: "number", minimum: 0, maximum: 100 },
        members: { type: "integer", minimum: 1, maximum: 8 },
      },
      required: ["id", "label", "x", "y", "members"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.households.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.households.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "x",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.households.x",
          message: "x",
        },
        kind: "number",
        min: 0,
        max: 100,
      },
      {
        path: "y",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.households.y",
          message: "y",
        },
        kind: "number",
        min: 0,
        max: 100,
      },
      {
        path: "members",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.households.members",
          message: "members",
        },
        kind: "number",
        min: 1,
        max: 8,
        step: 1,
      },
    ],
    help: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.households.help",
      message:
        "Unique household locations and their supplied member counts. 2..12 records; unique IDs <= 12 characters; labels <= 20 characters; coordinates 0..100; members integer 1..8; no location on a polygon boundary.",
    },
  },
  {
    path: "operation",
    label: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.operation",
      message: "operation",
    },
    kind: "select",
    options: [
      {
        value: "intersection",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.operation.intersection",
          message: "intersection",
        },
      },
      {
        value: "first-minus-second",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.operation.first-minus-second",
          message: "first-minus-second",
        },
      },
    ],
    help: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.operation.help",
      message:
        "Select locations in both layers or only in the first layer. One listed value; layer array order defines first and second.",
    },
  },
  {
    path: "measure",
    label: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.measure",
      message: "measure",
    },
    kind: "select",
    options: [
      {
        value: "households",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.measure.households",
          message: "households",
        },
      },
      {
        value: "members",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.measure.members",
          message: "members",
        },
      },
    ],
    help: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.measure.help",
      message:
        "Count unique household records or sum their supplied members. One listed value; denominator uses all supplied households under the same measure.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "context",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.copy.context",
          message: "context",
        },
        kind: "text",
        minLength: 0,
        maxLength: 40,
      },
      {
        path: "intersection",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.copy.intersection",
          message: "intersection",
        },
        kind: "text",
        minLength: 0,
        maxLength: 40,
      },
      {
        path: "difference",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.copy.difference",
          message: "difference",
        },
        kind: "text",
        minLength: 0,
        maxLength: 40,
      },
      {
        path: "selected",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.copy.selected",
          message: "selected",
        },
        kind: "text",
        minLength: 0,
        maxLength: 40,
      },
      {
        path: "total",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.copy.total",
          message: "total",
        },
        kind: "text",
        minLength: 0,
        maxLength: 40,
      },
      {
        path: "households",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.copy.households",
          message: "households",
        },
        kind: "text",
        minLength: 0,
        maxLength: 40,
      },
      {
        path: "members",
        label: {
          id: "motionAtlas.gis-layer-intersection-tally.controls.copy.members",
          message: "members",
        },
        kind: "text",
        minLength: 0,
        maxLength: 40,
      },
    ],
    help: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.copy.help",
      message:
        "Visible geography qualifier, operation names, quantity labels and units. All fields required; each <= 40 characters; context must identify fictional schematic geography.",
    },
  },
  {
    path: "showLayerOutlines",
    label: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.showLayerOutlines",
      message: "showLayerOutlines",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.gis-layer-intersection-tally.controls.showLayerOutlines.help",
      message:
        "Retain original layer outlines during the result hold. Boolean; result boundary and denominator remain visible.",
    },
  },
];
