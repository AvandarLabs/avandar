import type { StockControl } from "../../contracts/StockContract.types";

/** Serializable controls preserve nested fields and collection bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "entries",
    label: {
      id: "motionAtlas.journal-receipts.controls.entries",
      message: "entries",
    },
    help: {
      id: "motionAtlas.journal-receipts.controls.entries.help",
      message:
        "Pending entries retained in the journal, each with one tab and an identifier used for matching.",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 5,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 12,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.journal-receipts.controls.entries.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.journal-receipts.controls.entries.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
  },
  {
    path: "receipts",
    label: {
      id: "motionAtlas.journal-receipts.controls.receipts",
      message: "receipts",
    },
    help: {
      id: "motionAtlas.journal-receipts.controls.receipts.help",
      message:
        "The acknowledgments that arrive, in array order. Only the referenced entry's tab closes.",
    },
    kind: "collection",
    minItems: 0,
    maxItems: 5,
    itemSchema: {
      type: "object",
      properties: {
        entryId: {
          type: "string",
          minLength: 1,
          maxLength: 12,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 20,
        },
      },
      required: ["entryId", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "entryId",
        label: {
          id: "motionAtlas.journal-receipts.controls.receipts.entryId",
          message: "entryId",
        },
        kind: "select",
        optionsFrom: {
          path: "entries",
          valueKey: "id",
          labelKey: "label",
          scope: "root",
        },
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.journal-receipts.controls.receipts.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.journal-receipts.controls.copy",
      message: "copy",
    },
    help: {
      id: "motionAtlas.journal-receipts.controls.copy.help",
      message: "Titles and all visible connection and entry-state wording.",
    },
    kind: "object",
    controls: [
      {
        path: "journal",
        label: {
          id: "motionAtlas.journal-receipts.controls.copy.journal",
          message: "journal",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "receiptPocket",
        label: {
          id: "motionAtlas.journal-receipts.controls.copy.receiptPocket",
          message: "receiptPocket",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "disconnected",
        label: {
          id: "motionAtlas.journal-receipts.controls.copy.disconnected",
          message: "disconnected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "reconnected",
        label: {
          id: "motionAtlas.journal-receipts.controls.copy.reconnected",
          message: "reconnected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "pending",
        label: {
          id: "motionAtlas.journal-receipts.controls.copy.pending",
          message: "pending",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "acknowledged",
        label: {
          id: "motionAtlas.journal-receipts.controls.copy.acknowledged",
          message: "acknowledged",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.journal-receipts.controls.copy.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "foldDirection",
    label: {
      id: "motionAtlas.journal-receipts.controls.foldDirection",
      message: "foldDirection",
    },
    help: {
      id: "motionAtlas.journal-receipts.controls.foldDirection.help",
      message:
        "Choose the accordion opening direction while keeping exact receipt-to-entry alignment.",
    },
    kind: "select",
    options: [
      {
        value: "horizontal",
        label: {
          id: "motionAtlas.journal-receipts.options.foldDirection.horizontal",
          message: "horizontal",
        },
      },
      {
        value: "vertical",
        label: {
          id: "motionAtlas.journal-receipts.options.foldDirection.vertical",
          message: "vertical",
        },
      },
    ],
  },
  {
    path: "showIdentifiers",
    label: {
      id: "motionAtlas.journal-receipts.controls.showIdentifiers",
      message: "showIdentifiers",
    },
    help: {
      id: "motionAtlas.journal-receipts.controls.showIdentifiers.help",
      message:
        "Print the supplied entry identifiers on both matching halves to make receipt identity explicit.",
    },
    kind: "boolean",
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.journal-receipts.controls.showLabels",
      message: "showLabels",
    },
    help: {
      id: "motionAtlas.journal-receipts.controls.showLabels.help",
      message:
        "Show supplied labels, state captions, and the example annotation. Identifier visibility is also suppressed when false.",
    },
    kind: "boolean",
  },
];
