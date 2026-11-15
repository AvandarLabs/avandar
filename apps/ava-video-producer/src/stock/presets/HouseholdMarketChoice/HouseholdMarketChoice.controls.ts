import { z } from "zod";
import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive authoring controls. */
export const controls: StockControl[] = [
  {
    path: "products",
    label: {
      id: "motionAtlas.household-market-choice.controls.products.label",
      message: "products",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 5,
    itemSchema: z.toJSONSchema(
      z.strictObject({
        id: z.string().min(0).max(24),
        label: z.string().min(0).max(24),
        symbol: z.enum(["grain", "beans", "vegetables", "soap"]),
        price: z.number().finite().int().min(1).max(9),
        chosen: z.boolean(),
      }),
    ),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.household-market-choice.controls.products.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.household-market-choice.controls.products.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "symbol",
        label: {
          id: "motionAtlas.household-market-choice.controls.products.item.symbol.label",
          message: "symbol",
        },
        kind: "select",
        options: [
          {
            value: "grain",
            label: {
              id: "motionAtlas.household-market-choice.controls.products.item.symbol.grain",
              message: "grain",
            },
          },
          {
            value: "beans",
            label: {
              id: "motionAtlas.household-market-choice.controls.products.item.symbol.beans",
              message: "beans",
            },
          },
          {
            value: "vegetables",
            label: {
              id: "motionAtlas.household-market-choice.controls.products.item.symbol.vegetables",
              message: "vegetables",
            },
          },
          {
            value: "soap",
            label: {
              id: "motionAtlas.household-market-choice.controls.products.item.symbol.soap",
              message: "soap",
            },
          },
        ],
      },
      {
        path: "price",
        label: {
          id: "motionAtlas.household-market-choice.controls.products.item.price.label",
          message: "price",
        },
        kind: "number",
        min: 1,
        max: 9,
        step: 1,
      },
      {
        path: "chosen",
        label: {
          id: "motionAtlas.household-market-choice.controls.products.item.chosen.label",
          message: "chosen",
        },
        kind: "boolean",
      },
    ],
  },
  {
    path: "availableCredits",
    label: {
      id: "motionAtlas.household-market-choice.controls.availableCredits.label",
      message: "availableCredits",
    },
    kind: "number",
    min: 1,
    max: 30,
    step: 1,
  },
  {
    path: "tender",
    label: {
      id: "motionAtlas.household-market-choice.controls.tender.label",
      message: "tender",
    },
    kind: "select",
    options: [
      {
        value: "cash",
        label: {
          id: "motionAtlas.household-market-choice.controls.tender.cash",
          message: "cash",
        },
      },
      {
        value: "voucher",
        label: {
          id: "motionAtlas.household-market-choice.controls.tender.voucher",
          message: "voucher",
        },
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.household-market-choice.controls.labels.label",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "shopper",
        label: {
          id: "motionAtlas.household-market-choice.controls.labels.shopper.label",
          message: "shopper",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "retailer",
        label: {
          id: "motionAtlas.household-market-choice.controls.labels.retailer.label",
          message: "retailer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.household-market-choice.controls.labels.unit.label",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "total",
        label: {
          id: "motionAtlas.household-market-choice.controls.labels.total.label",
          message: "total",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "remaining",
        label: {
          id: "motionAtlas.household-market-choice.controls.labels.remaining.label",
          message: "remaining",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "tender",
        label: {
          id: "motionAtlas.household-market-choice.controls.labels.tender.label",
          message: "tender",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
    ],
  },
  {
    path: "showRemainingBalance",
    label: {
      id: "motionAtlas.household-market-choice.controls.showRemainingBalance.label",
      message: "showRemainingBalance",
    },
    kind: "boolean",
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.household-market-choice.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
  },
];
