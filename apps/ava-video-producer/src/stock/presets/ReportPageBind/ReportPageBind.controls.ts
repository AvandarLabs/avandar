import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for complete authored documents. */
export const CONTROLS: StockControl[] = [
  {
    path: "reportTitle",
    label: {
      id: "motionAtlas.report-page-bind.controls.reportTitle",
      message: "reportTitle",
    },
    kind: "text",
    minLength: 1,
    maxLength: 44,
    multiline: true,
  },
  {
    path: "sections",
    label: {
      id: "motionAtlas.report-page-bind.controls.sections",
      message: "sections",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        heading: {
          type: "string",
          minLength: 0,
          maxLength: 30,
        },
        body: {
          type: "string",
          minLength: 0,
          maxLength: 90,
        },
      },
      required: ["id", "heading", "body"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.report-page-bind.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
        multiline: true,
      },
      {
        path: "heading",
        label: {
          id: "motionAtlas.report-page-bind.controls.heading",
          message: "heading",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
        multiline: true,
      },
      {
        path: "body",
        label: {
          id: "motionAtlas.report-page-bind.controls.body",
          message: "body",
        },
        kind: "text",
        minLength: 0,
        maxLength: 90,
        multiline: true,
      },
    ],
  },
  {
    path: "byline",
    label: {
      id: "motionAtlas.report-page-bind.controls.byline",
      message: "byline",
    },
    kind: "text",
    minLength: 0,
    maxLength: 32,
    multiline: true,
  },
  {
    path: "destinationLabel",
    label: {
      id: "motionAtlas.report-page-bind.controls.destinationLabel",
      message: "destinationLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 32,
    multiline: true,
  },
  {
    path: "formatLabel",
    label: {
      id: "motionAtlas.report-page-bind.controls.formatLabel",
      message: "formatLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 10,
    multiline: true,
  },
  {
    path: "finalView",
    label: {
      id: "motionAtlas.report-page-bind.controls.finalView",
      message: "finalView",
    },
    kind: "select",
    options: [
      {
        value: "stack",
        label: {
          id: "motionAtlas.report-page-bind.controls.finalView.stack",
          message: "stack",
        },
      },
      {
        value: "spread",
        label: {
          id: "motionAtlas.report-page-bind.controls.finalView.spread",
          message: "spread",
        },
      },
    ],
  },
  {
    path: "showPageNumbers",
    label: {
      id: "motionAtlas.report-page-bind.controls.showPageNumbers",
      message: "showPageNumbers",
    },
    kind: "boolean",
  },
];
