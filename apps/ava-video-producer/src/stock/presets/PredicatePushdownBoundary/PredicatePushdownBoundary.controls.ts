import { z } from "zod";
import { inputSchema } from "./PredicatePushdownBoundary.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit serializable controls retain the full accepted input domains. */
export const controls: StockControl[] = [
  {
    path: "rows",
    label: {
      id: "motionAtlas.predicate-pushdown-boundary.controls.rows",
      message: "rows",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 8,
    itemSchema: z.toJSONSchema(inputSchema.shape.rows.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.rows.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.rows.value",
          message: "value",
        },
        kind: "number",
        min: -100,
        max: 100,
      },
    ],
  },
  {
    path: "predicate",
    label: {
      id: "motionAtlas.predicate-pushdown-boundary.controls.predicate",
      message: "predicate",
    },
    kind: "object",
    controls: [
      {
        path: "operator",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.predicate.operator",
          message: "operator",
        },
        kind: "select",
        options: [
          {
            value: ">=",
            label: {
              id: "motionAtlas.predicate-pushdown-boundary.controls.predicate.operator.0",
              message: ">=",
            },
          },
          {
            value: "<=",
            label: {
              id: "motionAtlas.predicate-pushdown-boundary.controls.predicate.operator.1",
              message: "<=",
            },
          },
        ],
      },
      {
        path: "threshold",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.predicate.threshold",
          message: "threshold",
        },
        kind: "number",
        min: -100,
        max: 100,
      },
    ],
  },
  {
    path: "metric",
    label: {
      id: "motionAtlas.predicate-pushdown-boundary.controls.metric",
      message: "metric",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.metric.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.metric.unit",
          message: "unit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "rowUnit",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.metric.rowUnit",
          message: "rowUnit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.predicate-pushdown-boundary.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "source",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.labels.source",
          message: "source",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "destination",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.labels.destination",
          message: "destination",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "condition",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.labels.condition",
          message: "condition",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "retained",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.labels.retained",
          message: "retained",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "transferred",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.labels.transferred",
          message: "transferred",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
  },
  {
    path: "showTotals",
    label: {
      id: "motionAtlas.predicate-pushdown-boundary.controls.showTotals",
      message: "showTotals",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.predicate-pushdown-boundary.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "context",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.copy.context",
          message: "context",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "source",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.copy.source",
          message: "source",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "result",
        label: {
          id: "motionAtlas.predicate-pushdown-boundary.controls.copy.result",
          message: "result",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
    ],
  },
];
