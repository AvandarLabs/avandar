import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for every authored field. */
export const CONTROLS: StockControl[] = [
  {
    path: "leftRows",
    label: {
      id: "motionAtlas.keyed-row-zipper.controls.leftRows",
      message: "leftRows",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          minLength: 1,
          maxLength: 10,
        },
        value: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
      },
      required: ["key", "value"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "key",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.leftRows.key",
          message: "key",
        },
        kind: "text",
        minLength: 1,
        maxLength: 10,
        multiline: true,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.leftRows.value",
          message: "value",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
        multiline: true,
      },
    ],
  },
  {
    path: "rightRows",
    label: {
      id: "motionAtlas.keyed-row-zipper.controls.rightRows",
      message: "rightRows",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          minLength: 1,
          maxLength: 10,
        },
        value: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
      },
      required: ["key", "value"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "key",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.rightRows.key",
          message: "key",
        },
        kind: "text",
        minLength: 1,
        maxLength: 10,
        multiline: true,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.rightRows.value",
          message: "value",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
        multiline: true,
      },
    ],
  },
  {
    path: "joinType",
    label: {
      id: "motionAtlas.keyed-row-zipper.controls.joinType",
      message: "joinType",
    },
    kind: "select",
    options: [
      {
        value: "inner",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.joinType.inner",
          message: "inner",
        },
      },
      {
        value: "left",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.joinType.left",
          message: "left",
        },
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.keyed-row-zipper.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "title",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.labels.title",
          message: "title",
        },
        kind: "text",
        minLength: 0,
        maxLength: 40,
        multiline: true,
      },
      {
        path: "left",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.labels.left",
          message: "left",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "right",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.labels.right",
          message: "right",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "key",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.labels.key",
          message: "key",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "result",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.labels.result",
          message: "result",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "unmatched",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.labels.unmatched",
          message: "unmatched",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "missing",
        label: {
          id: "motionAtlas.keyed-row-zipper.controls.labels.missing",
          message: "missing",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
        multiline: true,
      },
    ],
  },
  {
    path: "showKeys",
    label: {
      id: "motionAtlas.keyed-row-zipper.controls.showKeys",
      message: "showKeys",
    },
    kind: "boolean",
  },
  {
    path: "showUnmatchedTray",
    label: {
      id: "motionAtlas.keyed-row-zipper.controls.showUnmatchedTray",
      message: "showUnmatchedTray",
    },
    kind: "boolean",
  },
];
