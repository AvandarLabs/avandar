import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for every authored field. */
export const CONTROLS: StockControl[] = [
  {
    path: "records",
    label: {
      id: "motionAtlas.nested-drilldown-window.controls.records",
      message: "records",
    },
    kind: "collection",
    minItems: 4,
    maxItems: 8,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 18,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 22,
        },
        groups: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 18,
          },
          minItems: 2,
          maxItems: 2,
        },
      },
      required: ["id", "label", "groups"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.records.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
        multiline: true,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.records.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
        multiline: true,
      },
      {
        path: "groups",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.records.groups",
          message: "groups",
        },
        kind: "collection",
        minItems: 2,
        maxItems: 2,
        itemSchema: {
          type: "string",
          minLength: 1,
          maxLength: 18,
        },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.nested-drilldown-window.controls.records.groups.",
              message: "Value",
            },
            kind: "text",
            minLength: 1,
            maxLength: 18,
            multiline: true,
          },
        ],
      },
    ],
  },
  {
    path: "dimensions",
    label: {
      id: "motionAtlas.nested-drilldown-window.controls.dimensions",
      message: "dimensions",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "string",
      minLength: 1,
      maxLength: 22,
    },
    itemControls: [
      {
        path: "",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.dimensions.",
          message: "Value",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
        multiline: true,
      },
    ],
  },
  {
    path: "selectionPath",
    label: {
      id: "motionAtlas.nested-drilldown-window.controls.selectionPath",
      message: "selectionPath",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 2,
    itemSchema: {
      type: "string",
      minLength: 0,
      maxLength: 18,
    },
    itemControls: [
      {
        path: "",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.selectionPath.",
          message: "Value",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
        multiline: true,
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.nested-drilldown-window.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "title",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.labels.title",
          message: "title",
        },
        kind: "text",
        minLength: 0,
        maxLength: 42,
        multiline: true,
      },
      {
        path: "root",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.labels.root",
          message: "root",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
      {
        path: "detail",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.labels.detail",
          message: "detail",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
      {
        path: "context",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.labels.context",
          message: "context",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
    ],
  },
  {
    path: "retainContext",
    label: {
      id: "motionAtlas.nested-drilldown-window.controls.retainContext",
      message: "retainContext",
    },
    kind: "boolean",
  },
  {
    path: "selectionStyle",
    label: {
      id: "motionAtlas.nested-drilldown-window.controls.selectionStyle",
      message: "selectionStyle",
    },
    kind: "select",
    options: [
      {
        value: "window",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.selectionStyle.window",
          message: "window",
        },
      },
      {
        value: "inset-frame",
        label: {
          id: "motionAtlas.nested-drilldown-window.controls.selectionStyle.inset-frame",
          message: "inset-frame",
        },
      },
    ],
  },
];
