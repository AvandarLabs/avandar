import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable bounded recursive authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "goods",
    label: {
      id: "motionAtlas.retail-shelf-replenishment.controls.goods.label",
      message: "goods",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        symbol: {
          type: "string",
          enum: ["grain", "beans", "vegetables"],
        },
        openingUnits: {
          type: "integer",
          minimum: 0,
          maximum: 4,
        },
        incomingUnits: {
          type: "integer",
          minimum: 0,
          maximum: 4,
        },
        selectedUnits: {
          type: "integer",
          minimum: 0,
          maximum: 4,
        },
      },
      required: [
        "id",
        "label",
        "symbol",
        "openingUnits",
        "incomingUnits",
        "selectedUnits",
      ],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "symbol",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.symbol.label",
          message: "symbol",
        },
        kind: "select",
        options: [
          {
            value: "grain",
            label: {
              id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.symbol.grain",
              message: "grain",
            },
          },
          {
            value: "beans",
            label: {
              id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.symbol.beans",
              message: "beans",
            },
          },
          {
            value: "vegetables",
            label: {
              id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.symbol.vegetables",
              message: "vegetables",
            },
          },
        ],
      },
      {
        path: "openingUnits",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.openingUnits.label",
          message: "openingUnits",
        },
        kind: "number",
        min: 0,
        max: 4,
        step: 1,
      },
      {
        path: "incomingUnits",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.incomingUnits.label",
          message: "incomingUnits",
        },
        kind: "number",
        min: 0,
        max: 4,
        step: 1,
      },
      {
        path: "selectedUnits",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.goods.item.selectedUnits.label",
          message: "selectedUnits",
        },
        kind: "number",
        min: 0,
        max: 4,
        step: 1,
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.retail-shelf-replenishment.controls.labels.label",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "retailer",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.labels.retailer.label",
          message: "retailer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "shopper",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.labels.shopper.label",
          message: "shopper",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "order",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.labels.order.label",
          message: "order",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "delivery",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.labels.delivery.label",
          message: "delivery",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.labels.unit.label",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
    ],
  },
  {
    path: "deliveryMode",
    label: {
      id: "motionAtlas.retail-shelf-replenishment.controls.deliveryMode.label",
      message: "deliveryMode",
    },
    kind: "select",
    options: [
      {
        value: "handcart",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.deliveryMode.handcart",
          message: "handcart",
        },
      },
      {
        value: "cargo-bike",
        label: {
          id: "motionAtlas.retail-shelf-replenishment.controls.deliveryMode.cargo-bike",
          message: "cargo-bike",
        },
      },
    ],
  },
  {
    path: "showQuantityLabels",
    label: {
      id: "motionAtlas.retail-shelf-replenishment.controls.showQuantityLabels.label",
      message: "showQuantityLabels",
    },
    kind: "boolean",
  },
  {
    path: "showOrderSlip",
    label: {
      id: "motionAtlas.retail-shelf-replenishment.controls.showOrderSlip.label",
      message: "showOrderSlip",
    },
    kind: "boolean",
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.retail-shelf-replenishment.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
  },
];
