import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors for every supplied field. */
export const CONTROLS: StockControl[] = [
  {
    path: "slots",
    label: {
      id: "motionAtlas.protected-work-boundary.controls.slots",
      message: "Slots",
    },
    kind: "collection",
    minItems: 3,
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
          maxLength: 22,
        },
        kind: {
          enum: ["work", "rest", "learning", "community"],
        },
        workLabel: {
          anyOf: [
            {
              type: "string",
              minLength: 1,
              maxLength: 22,
            },
            {
              type: "null",
            },
          ],
        },
      },
      required: ["id", "label", "kind", "workLabel"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.slots.id",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.slots.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "kind",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.slots.kind",
          message: "Kind",
        },
        kind: "select",
        options: [
          {
            value: "work",
            label: {
              id: "motionAtlas.protected-work-boundary.controls.slots.kind.work",
              message: "work",
            },
          },
          {
            value: "rest",
            label: {
              id: "motionAtlas.protected-work-boundary.controls.slots.kind.rest",
              message: "rest",
            },
          },
          {
            value: "learning",
            label: {
              id: "motionAtlas.protected-work-boundary.controls.slots.kind.learning",
              message: "learning",
            },
          },
          {
            value: "community",
            label: {
              id: "motionAtlas.protected-work-boundary.controls.slots.kind.community",
              message: "community",
            },
          },
        ],
      },
      {
        path: "workLabel",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.slots.workLabel",
          message: "Work label",
        },
        nullable: true,
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
    ],
  },
  {
    path: "request",
    label: {
      id: "motionAtlas.protected-work-boundary.controls.request",
      message: "Request",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.request.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "requestedSlotId",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.request.requestedSlotId",
          message: "Requested slot id",
        },
        kind: "select",
        optionsFrom: {
          path: "slots",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "placement",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.request.placement",
          message: "Placement",
        },
        kind: "select",
        options: [
          {
            value: "defer",
            label: {
              id: "motionAtlas.protected-work-boundary.controls.request.placement.defer",
              message: "defer",
            },
          },
          {
            value: "reschedule",
            label: {
              id: "motionAtlas.protected-work-boundary.controls.request.placement.reschedule",
              message: "reschedule",
            },
          },
        ],
      },
      {
        path: "agreedSlotId",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.request.agreedSlotId",
          message: "Agreed slot id",
        },
        nullable: true,
        kind: "select",
        optionsFrom: {
          path: "slots",
          valueKey: "id",
          labelKey: "label",
        },
      },
    ],
  },
  {
    path: "workerLabel",
    label: {
      id: "motionAtlas.protected-work-boundary.controls.workerLabel",
      message: "Worker label",
    },
    kind: "text",
    minLength: 1,
    maxLength: 24,
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.protected-work-boundary.controls.labels",
      message: "Labels",
    },
    kind: "object",
    controls: [
      {
        path: "work",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.work",
          message: "Work",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "rest",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.rest",
          message: "Rest",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "learning",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.learning",
          message: "Learning",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "community",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.community",
          message: "Community",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "protected",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.protected",
          message: "Protected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "deferred",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.deferred",
          message: "Deferred",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "rescheduled",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.rescheduled",
          message: "Rescheduled",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.unit",
          message: "Unit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.labels.example",
          message: "Example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "showSlotLabels",
    label: {
      id: "motionAtlas.protected-work-boundary.controls.showSlotLabels",
      message: "Show slot labels",
    },
    kind: "boolean",
  },
  {
    path: "protectedPattern",
    label: {
      id: "motionAtlas.protected-work-boundary.controls.protectedPattern",
      message: "Protected pattern",
    },
    kind: "select",
    options: [
      {
        value: "hatch",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.protectedPattern.hatch",
          message: "hatch",
        },
      },
      {
        value: "dots",
        label: {
          id: "motionAtlas.protected-work-boundary.controls.protectedPattern.dots",
          message: "dots",
        },
      },
    ],
  },
];
