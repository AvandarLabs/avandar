import { z } from "zod";
import { inputSchema } from "./TravelTimeNetworkFrontier.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit numeric controls and reviewed schema-driven prose controls. */
export const controls: StockControl[] = [
  {
    kind: "collection",
    path: "nodes",
    minItems: 3,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.nodes.element),
    itemControls: [
      {
        kind: "text",
        path: "id",
        minLength: 0,
        maxLength: 12,
        label: {
          id: "motionAtlas.travel-time-network-frontier.control.id",
          message: "id",
        },
      },
      {
        kind: "text",
        path: "label",
        minLength: 0,
        maxLength: 16,
        label: {
          id: "motionAtlas.travel-time-network-frontier.control.label",
          message: "label",
        },
      },
      {
        kind: "number",
        path: "x",
        min: 5,
        max: 95,
        label: {
          id: "motionAtlas.travel-time-network-frontier.control.x",
          message: "x",
        },
      },
      {
        kind: "number",
        path: "y",
        min: 5,
        max: 95,
        label: {
          id: "motionAtlas.travel-time-network-frontier.control.y",
          message: "y",
        },
      },
    ],
    label: {
      id: "motionAtlas.travel-time-network-frontier.control.nodes",
      message: "nodes",
    },
  },
  {
    kind: "collection",
    path: "roads",
    minItems: 2,
    maxItems: 7,
    itemSchema: z.toJSONSchema(inputSchema.shape.roads.element),
    itemControls: [
      {
        kind: "text",
        path: "id",
        minLength: 0,
        maxLength: 12,
        label: {
          id: "motionAtlas.travel-time-network-frontier.control.id",
          message: "id",
        },
      },
      {
        kind: "select",
        path: "fromId",
        optionsFrom: { path: "nodes", valueKey: "id", labelKey: "label" },
        label: {
          id: "motionAtlas.travel-time-network-frontier.control.fromId",
          message: "fromId",
        },
      },
      {
        kind: "select",
        path: "toId",
        optionsFrom: { path: "nodes", valueKey: "id", labelKey: "label" },
        label: {
          id: "motionAtlas.travel-time-network-frontier.control.toId",
          message: "toId",
        },
      },
      {
        kind: "number",
        path: "minutes",
        min: 1,
        max: 20,
        step: 1,
        label: {
          id: "motionAtlas.travel-time-network-frontier.control.minutes",
          message: "minutes",
        },
      },
    ],
    label: {
      id: "motionAtlas.travel-time-network-frontier.control.roads",
      message: "roads",
    },
  },
  {
    kind: "select",
    path: "originId",
    optionsFrom: { path: "nodes", valueKey: "id", labelKey: "label" },
    label: {
      id: "motionAtlas.travel-time-network-frontier.control.originId",
      message: "originId",
    },
  },
  {
    kind: "number",
    path: "budgetMinutes",
    unit: {
      id: "motionAtlas.travel-time-network-frontier.minutes",
      message: "minutes",
    },
    min: 1,
    max: 40,
    step: 1,
    label: {
      id: "motionAtlas.travel-time-network-frontier.control.budgetMinutes",
      message: "budgetMinutes",
    },
  },
  {
    kind: "text",
    path: "modeLabel",
    minLength: 1,
    maxLength: 34,
    label: {
      id: "motionAtlas.travel-time-network-frontier.control.modeLabel",
      message: "modeLabel",
    },
  },
  {
    kind: "boolean",
    path: "showCosts",
    label: {
      id: "motionAtlas.travel-time-network-frontier.control.showCosts",
      message: "Show shortest costs and edge minutes.",
    },
  },
];
