import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for complete authored documents. */
export const CONTROLS: StockControl[] = [
  {
    path: "categories",
    label: {
      id: "motionAtlas.chart-focus-edit.controls.categories",
      message: "categories",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 5,
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
        value: {
          type: "number",
          minimum: 0,
          maximum: 10000,
        },
      },
      required: ["id", "label", "value"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.chart-focus-edit.controls.id",
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
          id: "motionAtlas.chart-focus-edit.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
        multiline: true,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.chart-focus-edit.controls.value",
          message: "value",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
    ],
  },
  {
    path: "axisMaximum",
    label: {
      id: "motionAtlas.chart-focus-edit.controls.axisMaximum",
      message: "axisMaximum",
    },
    kind: "number",
    min: 0,
    max: 1.7976931348623157e308,
  },
  {
    path: "unitLabel",
    label: {
      id: "motionAtlas.chart-focus-edit.controls.unitLabel",
      message: "unitLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 20,
    multiline: true,
  },
  {
    path: "focusId",
    label: {
      id: "motionAtlas.chart-focus-edit.controls.focusId",
      message: "focusId",
    },
    kind: "select",
    optionsFrom: {
      path: "categories",
      valueKey: "id",
      labelKey: "label",
    },
    nullable: true,
  },
  {
    path: "treatment",
    label: {
      id: "motionAtlas.chart-focus-edit.controls.treatment",
      message: "treatment",
    },
    kind: "select",
    options: [
      {
        value: "direct-labels",
        label: {
          id: "motionAtlas.chart-focus-edit.controls.treatment.direct-labels",
          message: "direct-labels",
        },
      },
      {
        value: "focus",
        label: {
          id: "motionAtlas.chart-focus-edit.controls.treatment.focus",
          message: "focus",
        },
      },
      {
        value: "both",
        label: {
          id: "motionAtlas.chart-focus-edit.controls.treatment.both",
          message: "both",
        },
      },
    ],
  },
  {
    path: "headings",
    label: {
      id: "motionAtlas.chart-focus-edit.controls.headings",
      message: "headings",
    },
    kind: "object",
    controls: [
      {
        path: "title",
        label: {
          id: "motionAtlas.chart-focus-edit.controls.title",
          message: "title",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
        multiline: true,
      },
      {
        path: "before",
        label: {
          id: "motionAtlas.chart-focus-edit.controls.before",
          message: "before",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
      {
        path: "after",
        label: {
          id: "motionAtlas.chart-focus-edit.controls.after",
          message: "after",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
    ],
  },
  {
    path: "showValueLabels",
    label: {
      id: "motionAtlas.chart-focus-edit.controls.showValueLabels",
      message: "showValueLabels",
    },
    kind: "boolean",
  },
  {
    path: "showBeforeGuide",
    label: {
      id: "motionAtlas.chart-focus-edit.controls.showBeforeGuide",
      message: "showBeforeGuide",
    },
    kind: "boolean",
  },
];
