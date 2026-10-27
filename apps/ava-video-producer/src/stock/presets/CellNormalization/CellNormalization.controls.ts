import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for complete authored documents. */
export const CONTROLS: StockControl[] = [
  {
    path: "title",
    label: {
      id: "motionAtlas.cell-normalization.controls.title",
      message: "title",
    },
    kind: "text",
    minLength: 1,
    maxLength: 46,
    multiline: true,
  },
  {
    path: "rows",
    label: {
      id: "motionAtlas.cell-normalization.controls.rows",
      message: "rows",
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
          maxLength: 16,
        },
        before: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        after: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        editLabel: {
          type: "string",
          minLength: 0,
          maxLength: 28,
        },
      },
      required: ["id", "before", "after", "editLabel"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.cell-normalization.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
        multiline: true,
      },
      {
        path: "before",
        label: {
          id: "motionAtlas.cell-normalization.controls.before",
          message: "before",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "after",
        label: {
          id: "motionAtlas.cell-normalization.controls.after",
          message: "after",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "editLabel",
        label: {
          id: "motionAtlas.cell-normalization.controls.editLabel",
          message: "editLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
        multiline: true,
      },
    ],
  },
  {
    path: "columnLabels",
    label: {
      id: "motionAtlas.cell-normalization.controls.columnLabels",
      message: "columnLabels",
    },
    kind: "object",
    controls: [
      {
        path: "original",
        label: {
          id: "motionAtlas.cell-normalization.controls.original",
          message: "original",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
        multiline: true,
      },
      {
        path: "result",
        label: {
          id: "motionAtlas.cell-normalization.controls.result",
          message: "result",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
        multiline: true,
      },
      {
        path: "change",
        label: {
          id: "motionAtlas.cell-normalization.controls.change",
          message: "change",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
        multiline: true,
      },
    ],
  },
  {
    path: "showWhitespace",
    label: {
      id: "motionAtlas.cell-normalization.controls.showWhitespace",
      message: "showWhitespace",
    },
    kind: "boolean",
  },
  {
    path: "comparison",
    label: {
      id: "motionAtlas.cell-normalization.controls.comparison",
      message: "comparison",
    },
    kind: "select",
    options: [
      {
        value: "side-rail",
        label: {
          id: "motionAtlas.cell-normalization.controls.comparison.side-rail",
          message: "side-rail",
        },
      },
      {
        value: "inline-ghost",
        label: {
          id: "motionAtlas.cell-normalization.controls.comparison.inline-ghost",
          message: "inline-ghost",
        },
      },
    ],
  },
  {
    path: "showEditLabels",
    label: {
      id: "motionAtlas.cell-normalization.controls.showEditLabels",
      message: "showEditLabels",
    },
    kind: "boolean",
  },
];
