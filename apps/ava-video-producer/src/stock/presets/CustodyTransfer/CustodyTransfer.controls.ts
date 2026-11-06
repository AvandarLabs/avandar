import type { StockControl } from "../../contracts/StockContract.types";

/** Recursive serializable controls retain exact accepted bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "holders",
    label: {
      id: "motionAtlas.custody-transfer.controls.holders",
      message: "holders",
    },
    kind: "object",
    controls: [
      {
        path: "sender",
        label: {
          id: "motionAtlas.custody-transfer.controls.sender",
          message: "sender",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "recipient",
        label: {
          id: "motionAtlas.custody-transfer.controls.recipient",
          message: "recipient",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
    help: {
      id: "motionAtlas.custody-transfer.controls.holders.help",
      message: "Names on the two support brackets.",
    },
  },
  {
    path: "object",
    label: {
      id: "motionAtlas.custody-transfer.controls.object",
      message: "object",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.custody-transfer.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "details",
        label: {
          id: "motionAtlas.custody-transfer.controls.details",
          message: "details",
        },
        kind: "collection",
        minItems: 0,
        maxItems: 3,
        itemSchema: {
          type: "string",
          minLength: 1,
          maxLength: 28,
        },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.custody-transfer.controls.details",
              message: "details",
            },
            kind: "text",
            minLength: 1,
            maxLength: 28,
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.custody-transfer.controls.object.help",
      message: "The single transferred object and its visible content lines.",
    },
  },
  {
    path: "outcome",
    label: {
      id: "motionAtlas.custody-transfer.controls.outcome",
      message: "outcome",
    },
    kind: "select",
    options: [
      {
        value: "accepted",
        label: {
          id: "motionAtlas.custody-transfer.controls.outcome.accepted",
          message: "accepted",
        },
      },
      {
        value: "awaiting-acceptance",
        label: {
          id: "motionAtlas.custody-transfer.controls.outcome.awaiting-acceptance",
          message: "awaiting-acceptance",
        },
      },
    ],
    help: {
      id: "motionAtlas.custody-transfer.controls.outcome.help",
      message:
        "Choose whether acknowledgment occurs. Without acceptance, the sender keeps responsibility and does not release.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.custody-transfer.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "offered",
        label: {
          id: "motionAtlas.custody-transfer.controls.offered",
          message: "offered",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "accepted",
        label: {
          id: "motionAtlas.custody-transfer.controls.accepted",
          message: "accepted",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "waiting",
        label: {
          id: "motionAtlas.custody-transfer.controls.waiting",
          message: "waiting",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "responsible",
        label: {
          id: "motionAtlas.custody-transfer.controls.responsible",
          message: "responsible",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.custody-transfer.controls.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
    ],
    help: {
      id: "motionAtlas.custody-transfer.controls.copy.help",
      message:
        "All visible action, acknowledgment, and responsibility captions.",
    },
  },
  {
    path: "objectShape",
    label: {
      id: "motionAtlas.custody-transfer.controls.objectShape",
      message: "objectShape",
    },
    kind: "select",
    options: [
      {
        value: "folio",
        label: {
          id: "motionAtlas.custody-transfer.controls.objectShape.folio",
          message: "folio",
        },
      },
      {
        value: "baton",
        label: {
          id: "motionAtlas.custody-transfer.controls.objectShape.baton",
          message: "baton",
        },
      },
      {
        value: "key",
        label: {
          id: "motionAtlas.custody-transfer.controls.objectShape.key",
          message: "key",
        },
      },
    ],
    help: {
      id: "motionAtlas.custody-transfer.controls.objectShape.help",
      message:
        "Choose a brief, relay, or key metaphor. Details remain on a fixed adjoining label area for narrow objects.",
    },
  },
  {
    path: "showResponsibilityMarker",
    label: {
      id: "motionAtlas.custody-transfer.controls.showResponsibilityMarker",
      message: "showResponsibilityMarker",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.custody-transfer.controls.showResponsibilityMarker.help",
      message:
        "Show the single marker indicating responsibility; support geometry still shows retention or release when hidden.",
    },
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.custody-transfer.controls.showLabels",
      message: "showLabels",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.custody-transfer.controls.showLabels.help",
      message: "Show supplied holder names, object details, and captions.",
    },
  },
];
