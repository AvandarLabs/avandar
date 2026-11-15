import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls with exact accepted structural bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "attempts",
    help: {
      id: "motionAtlas.retry-backoff.controls.attempts.help",
      message:
        "Defines every attempt, its outcome, and the waiting interval before the next attempt. 3..4 attempts; labels <= 16 characters; nonfinal outcomes must be retry; nonfinal delayAfter integers 1..16 and strictly increasing across nonfinal attempts; final outcome complete or stop with delayAfter 0",
    },
    label: {
      id: "motionAtlas.retry-backoff.controls.attempts",
      message: "attempts",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 4,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["label", "outcome", "delayAfter"],
      properties: {
        label: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        outcome: {
          type: "string",
          enum: ["retry", "complete", "stop"],
        },
        delayAfter: {
          type: "integer",
          minimum: 0,
          maximum: 16,
        },
      },
    },
    itemControls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.retry-backoff.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "outcome",
        label: {
          id: "motionAtlas.retry-backoff.controls.outcome",
          message: "outcome",
        },
        kind: "select",
        options: [
          {
            value: "retry",
            label: {
              id: "motionAtlas.retry-backoff.options.retry",
              message: "retry",
            },
          },
          {
            value: "complete",
            label: {
              id: "motionAtlas.retry-backoff.options.complete",
              message: "complete",
            },
          },
          {
            value: "stop",
            label: {
              id: "motionAtlas.retry-backoff.options.stop",
              message: "stop",
            },
          },
        ],
      },
      {
        path: "delayAfter",
        label: {
          id: "motionAtlas.retry-backoff.controls.delayAfter",
          message: "delayAfter",
        },
        kind: "number",
        min: 0,
        max: 16,
        step: 1,
      },
    ],
  },
  {
    path: "operationLabel",
    help: {
      id: "motionAtlas.retry-backoff.controls.operationLabel.help",
      message:
        "Names the operation that is retried without changing its identity. 1..24 characters",
    },
    label: {
      id: "motionAtlas.retry-backoff.controls.operationLabel",
      message: "operationLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 24,
  },
  {
    path: "outcomeLabels",
    help: {
      id: "motionAtlas.retry-backoff.controls.outcomeLabels.help",
      message:
        "Supplies the visible labels for attempt outcomes and waiting brackets. All four keys required; each label 1..18 characters",
    },
    label: {
      id: "motionAtlas.retry-backoff.controls.outcomeLabels",
      message: "outcomeLabels",
    },
    kind: "object",
    controls: [
      {
        path: "retry",
        label: {
          id: "motionAtlas.retry-backoff.controls.retry",
          message: "retry",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "complete",
        label: {
          id: "motionAtlas.retry-backoff.controls.complete",
          message: "complete",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "stop",
        label: {
          id: "motionAtlas.retry-backoff.controls.stop",
          message: "stop",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "wait",
        label: {
          id: "motionAtlas.retry-backoff.controls.wait",
          message: "wait",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
  },
  {
    path: "delayUnit",
    help: {
      id: "motionAtlas.retry-backoff.controls.delayUnit.help",
      message:
        "Names the authored delay unit shown beside waiting values. 1..12 characters; all delays use this same unit",
    },
    label: {
      id: "motionAtlas.retry-backoff.controls.delayUnit",
      message: "delayUnit",
    },
    kind: "text",
    minLength: 1,
    maxLength: 12,
  },
  {
    path: "showDelayValues",
    help: {
      id: "motionAtlas.retry-backoff.controls.showDelayValues.help",
      message:
        "Shows the supplied waits as values in addition to proportional brackets. boolean",
    },
    label: {
      id: "motionAtlas.retry-backoff.controls.showDelayValues",
      message: "showDelayValues",
    },
    kind: "boolean",
  },
  {
    path: "showAttemptLabels",
    help: {
      id: "motionAtlas.retry-backoff.controls.showAttemptLabels.help",
      message: "Shows the authored attempt labels under their markers. boolean",
    },
    label: {
      id: "motionAtlas.retry-backoff.controls.showAttemptLabels",
      message: "showAttemptLabels",
    },
    kind: "boolean",
  },
];
