import { z } from "zod";
import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive authoring controls. */
export const controls: StockControl[] = [
  {
    path: "contents",
    label: {
      id: "motionAtlas.recipient-confirmed-handover.controls.contents.label",
      message: "contents",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: z.toJSONSchema(
      z.strictObject({
        id: z.string().min(0).max(24),
        label: z.string().min(0).max(26),
        symbol: z.enum(["grain", "blanket", "soap", "container"]),
        offeredUnits: z.number().finite().int().min(1).max(4),
        selectedUnits: z.number().finite().int().min(0).max(4),
      }),
    ),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "symbol",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.symbol.label",
          message: "symbol",
        },
        kind: "select",
        options: [
          {
            value: "grain",
            label: {
              id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.symbol.grain",
              message: "grain",
            },
          },
          {
            value: "blanket",
            label: {
              id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.symbol.blanket",
              message: "blanket",
            },
          },
          {
            value: "soap",
            label: {
              id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.symbol.soap",
              message: "soap",
            },
          },
          {
            value: "container",
            label: {
              id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.symbol.container",
              message: "container",
            },
          },
        ],
      },
      {
        path: "offeredUnits",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.offeredUnits.label",
          message: "offeredUnits",
        },
        kind: "number",
        min: 1,
        max: 4,
        step: 1,
      },
      {
        path: "selectedUnits",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.contents.item.selectedUnits.label",
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
    path: "participantLabels",
    label: {
      id: "motionAtlas.recipient-confirmed-handover.controls.participantLabels.label",
      message: "participantLabels",
    },
    kind: "object",
    controls: [
      {
        path: "recipient",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.participantLabels.recipient.label",
          message: "recipient",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "deliveryTeam",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.participantLabels.deliveryTeam.label",
          message: "deliveryTeam",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
  },
  {
    path: "receiptLabels",
    label: {
      id: "motionAtlas.recipient-confirmed-handover.controls.receiptLabels.label",
      message: "receiptLabels",
    },
    kind: "object",
    controls: [
      {
        path: "heading",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.receiptLabels.heading.label",
          message: "heading",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "acknowledgement",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.receiptLabels.acknowledgement.label",
          message: "acknowledgement",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "recipientCopy",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.receiptLabels.recipientCopy.label",
          message: "recipientCopy",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "teamCopy",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.receiptLabels.teamCopy.label",
          message: "teamCopy",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "offered",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.receiptLabels.offered.label",
          message: "offered",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "selected",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.receiptLabels.selected.label",
          message: "selected",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "retained",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.receiptLabels.retained.label",
          message: "retained",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
    ],
  },
  {
    path: "acknowledgementMark",
    label: {
      id: "motionAtlas.recipient-confirmed-handover.controls.acknowledgementMark.label",
      message: "acknowledgementMark",
    },
    kind: "select",
    options: [
      {
        value: "tick",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.acknowledgementMark.tick",
          message: "tick",
        },
      },
      {
        value: "initials",
        label: {
          id: "motionAtlas.recipient-confirmed-handover.controls.acknowledgementMark.initials",
          message: "initials",
        },
      },
    ],
  },
  {
    path: "initialsText",
    label: {
      id: "motionAtlas.recipient-confirmed-handover.controls.initialsText.label",
      message: "initialsText",
    },
    kind: "text",
    minLength: 1,
    maxLength: 3,
  },
  {
    path: "showQuantityList",
    label: {
      id: "motionAtlas.recipient-confirmed-handover.controls.showQuantityList.label",
      message: "showQuantityList",
    },
    kind: "boolean",
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.recipient-confirmed-handover.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
  },
];
