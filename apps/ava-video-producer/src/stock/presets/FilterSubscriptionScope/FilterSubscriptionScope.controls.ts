import { z } from "zod";
import { inputSchema } from "./FilterSubscriptionScope.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit serializable controls retain the full accepted input domains. */
export const controls: StockControl[] = [
  {
    path: "records",
    label: {
      id: "motionAtlas.filter-subscription-scope.controls.records",
      message: "records",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.records.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.records.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "category",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.records.category",
          message: "category",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.records.value",
          message: "value",
        },
        kind: "number",
        min: 0,
        max: 100,
      },
    ],
  },
  {
    path: "views",
    label: {
      id: "motionAtlas.filter-subscription-scope.controls.views",
      message: "views",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: z.toJSONSchema(inputSchema.shape.views.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.views.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.views.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "subscribed",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.views.subscribed",
          message: "subscribed",
        },
        kind: "boolean",
      },
    ],
  },
  {
    path: "selectedCategory",
    label: {
      id: "motionAtlas.filter-subscription-scope.controls.selectedCategory",
      message: "selectedCategory",
    },
    kind: "select",
    optionsFrom: {
      path: "records",
      valueKey: "category",
      labelKey: "category",
    },
  },
  {
    path: "metric",
    label: {
      id: "motionAtlas.filter-subscription-scope.controls.metric",
      message: "metric",
    },
    kind: "object",
    controls: [
      {
        path: "valueLabel",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.metric.valueLabel",
          message: "valueLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "valueUnit",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.metric.valueUnit",
          message: "valueUnit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "countUnit",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.metric.countUnit",
          message: "countUnit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
    ],
  },
  {
    path: "showExcludedRecords",
    label: {
      id: "motionAtlas.filter-subscription-scope.controls.showExcludedRecords",
      message: "showExcludedRecords",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.filter-subscription-scope.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "context",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.copy.context",
          message: "context",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "source",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.copy.source",
          message: "source",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "result",
        label: {
          id: "motionAtlas.filter-subscription-scope.controls.copy.result",
          message: "result",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
    ],
  },
];
