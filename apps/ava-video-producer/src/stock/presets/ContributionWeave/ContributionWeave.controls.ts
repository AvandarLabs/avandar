import type { StockControl } from "../../contracts/StockContract.types";

/** Recursive serializable controls retain exact accepted bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "warp",
    label: {
      id: "motionAtlas.contribution-weave.controls.warp",
      message: "warp",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "pattern"],
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        pattern: {
          type: "string",
          enum: ["solid", "stripe", "dot"],
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.contribution-weave.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.contribution-weave.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "pattern",
        label: {
          id: "motionAtlas.contribution-weave.controls.pattern",
          message: "pattern",
        },
        kind: "select",
        options: [
          {
            value: "solid",
            label: {
              id: "motionAtlas.contribution-weave.controls.pattern.solid",
              message: "solid",
            },
          },
          {
            value: "stripe",
            label: {
              id: "motionAtlas.contribution-weave.controls.pattern.stripe",
              message: "stripe",
            },
          },
          {
            value: "dot",
            label: {
              id: "motionAtlas.contribution-weave.controls.pattern.dot",
              message: "dot",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.contribution-weave.controls.warp.help",
      message:
        "Vertical contributions fixed to the loom. Each item owns exactly one band and one visible labeled end.",
    },
  },
  {
    path: "weft",
    label: {
      id: "motionAtlas.contribution-weave.controls.weft",
      message: "weft",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "pattern"],
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        pattern: {
          type: "string",
          enum: ["solid", "stripe", "dot"],
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.contribution-weave.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.contribution-weave.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "pattern",
        label: {
          id: "motionAtlas.contribution-weave.controls.pattern",
          message: "pattern",
        },
        kind: "select",
        options: [
          {
            value: "solid",
            label: {
              id: "motionAtlas.contribution-weave.controls.pattern.solid",
              message: "solid",
            },
          },
          {
            value: "stripe",
            label: {
              id: "motionAtlas.contribution-weave.controls.pattern.stripe",
              message: "stripe",
            },
          },
          {
            value: "dot",
            label: {
              id: "motionAtlas.contribution-weave.controls.pattern.dot",
              message: "dot",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.contribution-weave.controls.weft.help",
      message:
        "Horizontal contributions woven in array order. Each item owns one shuttle pass and one final band.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.contribution-weave.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "result",
        label: {
          id: "motionAtlas.contribution-weave.controls.result",
          message: "result",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.contribution-weave.controls.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
    ],
    help: {
      id: "motionAtlas.contribution-weave.controls.copy.help",
      message: "The collective result label and example annotation.",
    },
  },
  {
    path: "weaveStart",
    label: {
      id: "motionAtlas.contribution-weave.controls.weaveStart",
      message: "weaveStart",
    },
    kind: "select",
    options: [
      {
        value: "over-first",
        label: {
          id: "motionAtlas.contribution-weave.controls.weaveStart.over-first",
          message: "over-first",
        },
      },
      {
        value: "under-first",
        label: {
          id: "motionAtlas.contribution-weave.controls.weaveStart.under-first",
          message: "under-first",
        },
      },
    ],
    help: {
      id: "motionAtlas.contribution-weave.controls.weaveStart.help",
      message:
        "Choose the first crossing pattern; subsequent crossings alternate consistently without changing contributor roles.",
    },
  },
  {
    path: "showContributorEnds",
    label: {
      id: "motionAtlas.contribution-weave.controls.showContributorEnds",
      message: "showContributorEnds",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.contribution-weave.controls.showContributorEnds.help",
      message:
        "Retain the outer band ends so a viewer can trace each contribution into the fabric.",
    },
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.contribution-weave.controls.showLabels",
      message: "showLabels",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.contribution-weave.controls.showLabels.help",
      message:
        "Show all contribution names, result text, and the example annotation.",
    },
  },
];
