import { z } from "zod";
import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive authoring controls. */
export const controls: StockControl[] = [
  {
    path: "carriers",
    label: {
      id: "motionAtlas.aid-cargo-mode-handoff.controls.carriers.label",
      message: "carriers",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: z.toJSONSchema(
      z.strictObject({
        id: z.string().min(0).max(24),
        mode: z.enum(["boat", "truck", "cargo-bike"]),
        handoffLabel: z.string().min(0).max(24),
      }),
    ),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.aid-cargo-mode-handoff.controls.carriers.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "mode",
        label: {
          id: "motionAtlas.aid-cargo-mode-handoff.controls.carriers.item.mode.label",
          message: "mode",
        },
        kind: "select",
        options: [
          {
            value: "boat",
            label: {
              id: "motionAtlas.aid-cargo-mode-handoff.controls.carriers.item.mode.boat",
              message: "boat",
            },
          },
          {
            value: "truck",
            label: {
              id: "motionAtlas.aid-cargo-mode-handoff.controls.carriers.item.mode.truck",
              message: "truck",
            },
          },
          {
            value: "cargo-bike",
            label: {
              id: "motionAtlas.aid-cargo-mode-handoff.controls.carriers.item.mode.cargo-bike",
              message: "cargo-bike",
            },
          },
        ],
      },
      {
        path: "handoffLabel",
        label: {
          id: "motionAtlas.aid-cargo-mode-handoff.controls.carriers.item.handoffLabel.label",
          message: "handoffLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
    ],
  },
  {
    path: "parcels",
    label: {
      id: "motionAtlas.aid-cargo-mode-handoff.controls.parcels.label",
      message: "parcels",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: z.toJSONSchema(
      z.strictObject({
        id: z.string().min(0).max(24),
        label: z.string().min(0).max(26),
        symbol: z.enum(["grain", "blanket", "tool"]),
      }),
    ),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.aid-cargo-mode-handoff.controls.parcels.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.aid-cargo-mode-handoff.controls.parcels.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "symbol",
        label: {
          id: "motionAtlas.aid-cargo-mode-handoff.controls.parcels.item.symbol.label",
          message: "symbol",
        },
        kind: "select",
        options: [
          {
            value: "grain",
            label: {
              id: "motionAtlas.aid-cargo-mode-handoff.controls.parcels.item.symbol.grain",
              message: "grain",
            },
          },
          {
            value: "blanket",
            label: {
              id: "motionAtlas.aid-cargo-mode-handoff.controls.parcels.item.symbol.blanket",
              message: "blanket",
            },
          },
          {
            value: "tool",
            label: {
              id: "motionAtlas.aid-cargo-mode-handoff.controls.parcels.item.symbol.tool",
              message: "tool",
            },
          },
        ],
      },
    ],
  },
  {
    path: "transferMethod",
    label: {
      id: "motionAtlas.aid-cargo-mode-handoff.controls.transferMethod.label",
      message: "transferMethod",
    },
    kind: "select",
    options: [
      {
        value: "handcart",
        label: {
          id: "motionAtlas.aid-cargo-mode-handoff.controls.transferMethod.handcart",
          message: "handcart",
        },
      },
      {
        value: "hoist-and-cart",
        label: {
          id: "motionAtlas.aid-cargo-mode-handoff.controls.transferMethod.hoist-and-cart",
          message: "hoist-and-cart",
        },
      },
    ],
  },
  {
    path: "receivingLabel",
    label: {
      id: "motionAtlas.aid-cargo-mode-handoff.controls.receivingLabel.label",
      message: "receivingLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 30,
  },
  {
    path: "showParcelLabels",
    label: {
      id: "motionAtlas.aid-cargo-mode-handoff.controls.showParcelLabels.label",
      message: "showParcelLabels",
    },
    kind: "boolean",
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.aid-cargo-mode-handoff.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
  },
];
