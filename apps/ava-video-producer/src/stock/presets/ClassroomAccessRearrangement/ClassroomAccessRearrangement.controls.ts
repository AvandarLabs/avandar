import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors preserve authored field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "learners",
    label: {
      id: "motionAtlas.classroom-access-rearrangement.controls.learners",
      message: "learners",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 20 },
        label: { type: "string", minLength: 1, maxLength: 16 },
        movementIcon: { type: "string", enum: ["walking", "wheeled"] },
      },
      required: ["id", "label", "movementIcon"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.learners.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.learners.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "movementIcon",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.learners.movementIcon",
          message: "movementIcon",
        },
        kind: "select",
        options: [
          {
            value: "walking",
            label: {
              id: "motionAtlas.classroom-access-rearrangement.controls.learners.movementIcon.walking",
              message: "walking",
            },
          },
          {
            value: "wheeled",
            label: {
              id: "motionAtlas.classroom-access-rearrangement.controls.learners.movementIcon.wheeled",
              message: "wheeled",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.classroom-access-rearrangement.controls.learners.help",
      message:
        "The same represented learners before and after rearrangement. A mobility icon is an authored visual choice, not an inferred diagnosis. 2..6 entries; unique IDs 1..20 characters; labels 1..16 characters; icons persist unchanged across all beats",
    },
  },
  {
    path: "adaptations",
    label: {
      id: "motionAtlas.classroom-access-rearrangement.controls.adaptations",
      message: "adaptations",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 20 },
        label: { type: "string", minLength: 1, maxLength: 28 },
        kind: {
          type: "string",
          enum: ["clear-approach", "shared-table", "large-print-board"],
        },
      },
      required: ["id", "label", "kind"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.adaptations.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.adaptations.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "kind",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.adaptations.kind",
          message: "kind",
        },
        kind: "select",
        options: [
          {
            value: "clear-approach",
            label: {
              id: "motionAtlas.classroom-access-rearrangement.controls.adaptations.kind.clear-approach",
              message: "clear-approach",
            },
          },
          {
            value: "shared-table",
            label: {
              id: "motionAtlas.classroom-access-rearrangement.controls.adaptations.kind.shared-table",
              message: "shared-table",
            },
          },
          {
            value: "large-print-board",
            label: {
              id: "motionAtlas.classroom-access-rearrangement.controls.adaptations.kind.large-print-board",
              message: "large-print-board",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.classroom-access-rearrangement.controls.adaptations.help",
      message:
        "The explicitly selected environmental changes and their callout labels. 1..3 entries; unique IDs 1..20 characters; unique kinds; labels 1..28 characters; clear-approach is required for a crowded-row opening; table and board changes are shown only when selected",
    },
  },
  {
    path: "activity",
    label: {
      id: "motionAtlas.classroom-access-rearrangement.controls.activity",
      message: "activity",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.activity.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "boardText",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.activity.boardText",
          message: "boardText",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
    ],
    help: {
      id: "motionAtlas.classroom-access-rearrangement.controls.activity.help",
      message:
        "The common activity and teaching-surface text, available to the entire represented group. Label 1..28 characters; board text 1..36 characters; no diagnostic or ability labels",
    },
  },
  {
    path: "resolvedLayout",
    label: {
      id: "motionAtlas.classroom-access-rearrangement.controls.resolvedLayout",
      message: "resolvedLayout",
    },
    kind: "select",
    options: [
      {
        value: "shared-circle",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.resolvedLayout.shared-circle",
          message: "shared-circle",
        },
      },
      {
        value: "open-horseshoe",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.resolvedLayout.open-horseshoe",
          message: "open-horseshoe",
        },
      },
    ],
    help: {
      id: "motionAtlas.classroom-access-rearrangement.controls.resolvedLayout.help",
      message:
        "The final common arrangement around the selected teaching surface. One of the declared values; every learner remains inside the common activity area",
    },
  },
  {
    path: "showApproachTrace",
    label: {
      id: "motionAtlas.classroom-access-rearrangement.controls.showApproachTrace",
      message: "showApproachTrace",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.classroom-access-rearrangement.controls.showApproachTrace.help",
      message:
        "Reveal a brief line through the newly cleared floor area to the common activity. boolean; schematic path only, with no measurements or accessibility certification",
    },
  },
  {
    path: "phaseLabels",
    label: {
      id: "motionAtlas.classroom-access-rearrangement.controls.phaseLabels",
      message: "phaseLabels",
    },
    kind: "object",
    controls: [
      {
        path: "before",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.phaseLabels.before",
          message: "before",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "after",
        label: {
          id: "motionAtlas.classroom-access-rearrangement.controls.phaseLabels.after",
          message: "after",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
    help: {
      id: "motionAtlas.classroom-access-rearrangement.controls.phaseLabels.help",
      message:
        "The two spatial arrangement labels. Each label 1..28 characters",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.classroom-access-rearrangement.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 56,
    help: {
      id: "motionAtlas.classroom-access-rearrangement.controls.caption.help",
      message:
        "Context preventing the room sketch from being read as a compliant building plan. 1..56 characters",
    },
  },
];
