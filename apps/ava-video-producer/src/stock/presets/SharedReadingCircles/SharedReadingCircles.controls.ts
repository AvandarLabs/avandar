import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editors preserve all authored collection and field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "learners",
    label: {
      id: "motionAtlas.shared-reading-circles.controls.learners",
      message: "learners",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 8,
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
          maxLength: 16,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.learners.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.learners.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
    help: {
      id: "motionAtlas.shared-reading-circles.controls.learners.help",
      message:
        "The full represented class, with stable identities as seats move. 2..8 entries; unique IDs 1..20 characters; labels 1..16 characters",
    },
  },
  {
    path: "books",
    label: {
      id: "motionAtlas.shared-reading-circles.controls.books",
      message: "books",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
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
        pageLabel: {
          type: "string",
          minLength: 1,
          maxLength: 28,
        },
      },
      required: ["id", "label", "pageLabel"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.books.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.books.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "pageLabel",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.books.pageLabel",
          message: "pageLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
    help: {
      id: "motionAtlas.shared-reading-circles.controls.books.help",
      message:
        "Physical book copies. Each entry appears once on the shelf and once at its assigned table. 1..4 books; unique IDs 1..20 characters; labels 1..22 characters; page labels 1..28 characters; book count cannot exceed learner count",
    },
  },
  {
    path: "readingGroups",
    label: {
      id: "motionAtlas.shared-reading-circles.controls.readingGroups",
      message: "readingGroups",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        bookId: {
          type: "string",
          minLength: 1,
          maxLength: 20,
        },
        learnerIds: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
            maxLength: 20,
          },
          minItems: 1,
          maxItems: 4,
        },
      },
      required: ["bookId", "learnerIds"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "bookId",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.readingGroups.bookId",
          message: "bookId",
        },
        kind: "select",
        optionsFrom: {
          path: "books",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "learnerIds",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.readingGroups.learnerIds",
          message: "learnerIds",
        },
        kind: "collection",
        minItems: 1,
        maxItems: 4,
        itemSchema: {
          type: "string",
          minLength: 1,
          maxLength: 20,
        },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.shared-reading-circles.controls.readingGroups.learnerIds.item",
              message: "Learner",
            },
            kind: "select",
            optionsFrom: {
              path: "learners",
              valueKey: "id",
              labelKey: "label",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.shared-reading-circles.controls.readingGroups.help",
      message:
        "The explicit reader allocation for each physical book. Exactly one group per book ID; 1..4 learner IDs per group; every learner ID occurs exactly once across all groups; no unknown IDs",
    },
  },
  {
    path: "startingShelf",
    label: {
      id: "motionAtlas.shared-reading-circles.controls.startingShelf",
      message: "startingShelf",
    },
    kind: "select",
    options: [
      {
        value: "front",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.startingShelf.front",
          message: "front",
        },
      },
      {
        value: "side",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.startingShelf.side",
          message: "side",
        },
      },
    ],
    help: {
      id: "motionAtlas.shared-reading-circles.controls.startingShelf.help",
      message:
        "The shelf position from which the existing copies move. One of the declared values; no change to inventory or group membership",
    },
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.shared-reading-circles.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "books",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.labels.books",
          message: "books",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "readers",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.labels.readers",
          message: "readers",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "class",
        label: {
          id: "motionAtlas.shared-reading-circles.controls.labels.class",
          message: "class",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
    ],
    help: {
      id: "motionAtlas.shared-reading-circles.controls.labels.help",
      message:
        "Visible inventory and reader-denominator labels. Each label 1..26 characters",
    },
  },
  {
    path: "showGroupCounts",
    label: {
      id: "motionAtlas.shared-reading-circles.controls.showGroupCounts",
      message: "showGroupCounts",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.shared-reading-circles.controls.showGroupCounts.help",
      message:
        "Show each group size over the full learner array length and the separate physical book inventory. boolean; counts derive only from supplied arrays",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.shared-reading-circles.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
    help: {
      id: "motionAtlas.shared-reading-circles.controls.caption.help",
      message:
        "Context identifying the illustrative sharing arrangement. 1..48 characters",
    },
  },
];
