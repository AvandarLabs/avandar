import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for complete authored documents. */
export const CONTROLS: StockControl[] = [
  {
    path: "title",
    label: {
      id: "motionAtlas.pipeline-step-splice.controls.title",
      message: "title",
    },
    kind: "text",
    minLength: 1,
    maxLength: 46,
    multiline: true,
  },
  {
    path: "steps",
    label: {
      id: "motionAtlas.pipeline-step-splice.controls.steps",
      message: "steps",
    },
    kind: "collection",
    minItems: 3,
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
          maxLength: 24,
        },
        isInserted: {
          type: "boolean",
        },
      },
      required: ["id", "label", "isInserted"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.pipeline-step-splice.controls.id",
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
          id: "motionAtlas.pipeline-step-splice.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "isInserted",
        label: {
          id: "motionAtlas.pipeline-step-splice.controls.isInserted",
          message: "isInserted",
        },
        kind: "boolean",
      },
    ],
  },
  {
    path: "editLabel",
    label: {
      id: "motionAtlas.pipeline-step-splice.controls.editLabel",
      message: "editLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 30,
    multiline: true,
  },
  {
    path: "preview",
    label: {
      id: "motionAtlas.pipeline-step-splice.controls.preview",
      message: "preview",
    },
    kind: "object",
    controls: [
      {
        path: "inputLabel",
        label: {
          id: "motionAtlas.pipeline-step-splice.controls.inputLabel",
          message: "inputLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
        multiline: true,
      },
      {
        path: "inputValue",
        label: {
          id: "motionAtlas.pipeline-step-splice.controls.inputValue",
          message: "inputValue",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
        multiline: true,
      },
      {
        path: "outputLabel",
        label: {
          id: "motionAtlas.pipeline-step-splice.controls.outputLabel",
          message: "outputLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
        multiline: true,
      },
      {
        path: "outputValue",
        label: {
          id: "motionAtlas.pipeline-step-splice.controls.outputValue",
          message: "outputValue",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
        multiline: true,
      },
    ],
  },
  {
    path: "showPreview",
    label: {
      id: "motionAtlas.pipeline-step-splice.controls.showPreview",
      message: "showPreview",
    },
    kind: "boolean",
  },
  {
    path: "joinStyle",
    label: {
      id: "motionAtlas.pipeline-step-splice.controls.joinStyle",
      message: "joinStyle",
    },
    kind: "select",
    options: [
      {
        value: "tabbed",
        label: {
          id: "motionAtlas.pipeline-step-splice.controls.joinStyle.tabbed",
          message: "tabbed",
        },
      },
      {
        value: "continuous-ribbon",
        label: {
          id: "motionAtlas.pipeline-step-splice.controls.joinStyle.continuous-ribbon",
          message: "continuous-ribbon",
        },
      },
    ],
  },
];
