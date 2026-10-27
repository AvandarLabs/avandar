import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors for every supplied field. */
export const CONTROLS: StockControl[] = [
  {
    path: "periods",
    label: {
      id: "motionAtlas.term-limited-revenue-share.controls.periods",
      message: "Periods",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        receiptsMinor: {
          type: "integer",
          minimum: 1,
          maximum: 1000000,
        },
        operatingOutflowMinor: {
          type: "integer",
          minimum: 0,
          maximum: 1000000,
        },
        distributionActive: {
          type: "boolean",
        },
      },
      required: [
        "id",
        "label",
        "receiptsMinor",
        "operatingOutflowMinor",
        "distributionActive",
      ],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.periods.id",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.periods.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "receiptsMinor",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.periods.receiptsMinor",
          message: "Receipts minor",
        },
        kind: "number",
        min: 1,
        max: 1000000,
        step: 1,
      },
      {
        path: "operatingOutflowMinor",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.periods.operatingOutflowMinor",
          message: "Operating outflow minor",
        },
        kind: "number",
        min: 0,
        max: 1000000,
        step: 1,
      },
      {
        path: "distributionActive",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.periods.distributionActive",
          message: "Distribution active",
        },
        kind: "boolean",
      },
    ],
  },
  {
    path: "arrangement",
    label: {
      id: "motionAtlas.term-limited-revenue-share.controls.arrangement",
      message: "Arrangement",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.arrangement.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "rateBasisPoints",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.arrangement.rateBasisPoints",
          message: "Rate basis points",
        },
        kind: "number",
        min: 1,
        max: 10000,
        step: 1,
      },
      {
        path: "termBoundaryLabel",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.arrangement.termBoundaryLabel",
          message: "Term boundary label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
    ],
  },
  {
    path: "money",
    label: {
      id: "motionAtlas.term-limited-revenue-share.controls.money",
      message: "Money",
    },
    kind: "object",
    controls: [
      {
        path: "unitLabel",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.money.unitLabel",
          message: "Unit label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "minorUnitsPerUnit",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.money.minorUnitsPerUnit",
          message: "Minor units per unit",
        },
        kind: "select",
        options: [
          {
            value: 1,
            label: {
              id: "motionAtlas.term-limited-revenue-share.controls.money.minorUnitsPerUnit.1",
              message: "1",
            },
          },
          {
            value: 100,
            label: {
              id: "motionAtlas.term-limited-revenue-share.controls.money.minorUnitsPerUnit.100",
              message: "100",
            },
          },
        ],
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.term-limited-revenue-share.controls.copy",
      message: "Copy",
    },
    kind: "object",
    controls: [
      {
        path: "receipts",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.copy.receipts",
          message: "Receipts",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "operating",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.copy.operating",
          message: "Operating",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "distribution",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.copy.distribution",
          message: "Distribution",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "retained",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.copy.retained",
          message: "Retained",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.copy.example",
          message: "Example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 60,
      },
    ],
  },
  {
    path: "showAmounts",
    label: {
      id: "motionAtlas.term-limited-revenue-share.controls.showAmounts",
      message: "Show amounts",
    },
    kind: "boolean",
  },
  {
    path: "arrangementLayout",
    label: {
      id: "motionAtlas.term-limited-revenue-share.controls.arrangementLayout",
      message: "Arrangement layout",
    },
    kind: "select",
    options: [
      {
        value: "side-by-side",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.arrangementLayout.side-by-side",
          message: "side-by-side",
        },
      },
      {
        value: "stacked",
        label: {
          id: "motionAtlas.term-limited-revenue-share.controls.arrangementLayout.stacked",
          message: "stacked",
        },
      },
    ],
  },
];
