import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editors preserve all authored collection and field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "expenses",
    label: {
      id: "motionAtlas.school-cost-satchel.controls.expenses",
      message: "expenses",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 5,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 20,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 22,
        },
        object: {
          type: "string",
          enum: ["book", "ticket", "clothing", "meal", "fee-slip"],
        },
        amount: {
          type: "integer",
          minimum: 0,
          maximum: 20,
        },
      },
      required: ["id", "label", "object", "amount"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.expenses.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.expenses.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "object",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.expenses.object",
          message: "object",
        },
        kind: "select",
        options: [
          {
            value: "book",
            label: {
              id: "motionAtlas.school-cost-satchel.controls.expenses.object.book",
              message: "book",
            },
          },
          {
            value: "ticket",
            label: {
              id: "motionAtlas.school-cost-satchel.controls.expenses.object.ticket",
              message: "ticket",
            },
          },
          {
            value: "clothing",
            label: {
              id: "motionAtlas.school-cost-satchel.controls.expenses.object.clothing",
              message: "clothing",
            },
          },
          {
            value: "meal",
            label: {
              id: "motionAtlas.school-cost-satchel.controls.expenses.object.meal",
              message: "meal",
            },
          },
          {
            value: "fee-slip",
            label: {
              id: "motionAtlas.school-cost-satchel.controls.expenses.object.fee-slip",
              message: "fee slip",
            },
          },
        ],
      },
      {
        path: "amount",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.expenses.amount",
          message: "amount",
        },
        kind: "number",
        min: 0,
        max: 20,
        step: 1,
      },
    ],
    help: {
      id: "motionAtlas.school-cost-satchel.controls.expenses.help",
      message:
        "The expense objects unpacked from the bag. Their amounts are the only source of the displayed total. 2..5 entries; unique IDs 1..20 characters; labels 1..22 characters; amounts integers 0..20; sum must be positive; no duplicate expense may represent the same cost twice",
    },
  },
  {
    path: "periodLabel",
    label: {
      id: "motionAtlas.school-cost-satchel.controls.periodLabel",
      message: "periodLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 32,
    help: {
      id: "motionAtlas.school-cost-satchel.controls.periodLabel.help",
      message:
        "The common accounting window for every expense. 1..32 characters; all supplied amounts must already refer to this same period",
    },
  },
  {
    path: "unitLabel",
    label: {
      id: "motionAtlas.school-cost-satchel.controls.unitLabel",
      message: "unitLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 18,
    help: {
      id: "motionAtlas.school-cost-satchel.controls.unitLabel.help",
      message:
        "The fictional currency or other authored common monetary unit. 1..18 characters; one unit for all amounts; no exchange-rate conversion",
    },
  },
  {
    path: "sceneLabels",
    label: {
      id: "motionAtlas.school-cost-satchel.controls.sceneLabels",
      message: "sceneLabels",
    },
    kind: "object",
    controls: [
      {
        path: "learner",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.sceneLabels.learner",
          message: "learner",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "school",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.sceneLabels.school",
          message: "school",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "total",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.sceneLabels.total",
          message: "total",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
    help: {
      id: "motionAtlas.school-cost-satchel.controls.sceneLabels.help",
      message:
        "Visible person, building, and total labels. Each label 1..24 characters",
    },
  },
  {
    path: "showExpenseShares",
    label: {
      id: "motionAtlas.school-cost-satchel.controls.showExpenseShares",
      message: "showExpenseShares",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.school-cost-satchel.controls.showExpenseShares.help",
      message:
        "Show each expense amount over the sum of listed expenses, using the same unit as the total. boolean; share denominator is the derived sum, never a separately entered budget",
    },
  },
  {
    path: "unpackOrder",
    label: {
      id: "motionAtlas.school-cost-satchel.controls.unpackOrder",
      message: "unpackOrder",
    },
    kind: "select",
    options: [
      {
        value: "input-order",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.unpackOrder.input-order",
          message: "input order",
        },
      },
      {
        value: "largest-first",
        label: {
          id: "motionAtlas.school-cost-satchel.controls.unpackOrder.largest-first",
          message: "largest first",
        },
      },
    ],
    help: {
      id: "motionAtlas.school-cost-satchel.controls.unpackOrder.help",
      message:
        "Choose the order in which cost objects leave the bag. One of the declared values; equal amounts preserve input order",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.school-cost-satchel.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 56,
    help: {
      id: "motionAtlas.school-cost-satchel.controls.caption.help",
      message:
        "Context for the illustrative expense breakdown. 1..56 characters",
    },
  },
];
