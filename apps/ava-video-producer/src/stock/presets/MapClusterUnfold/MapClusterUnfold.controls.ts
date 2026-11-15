import { z } from "zod";
import { inputSchema } from "./MapClusterUnfold.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit serializable controls retain the full accepted input domains. */
export const controls: StockControl[] = [
  {
    path: "points",
    label: {
      id: "motionAtlas.map-cluster-unfold.controls.points",
      message: "points",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 8,
    itemSchema: z.toJSONSchema(inputSchema.shape.points.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.points.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.points.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "x",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.points.x",
          message: "x",
        },
        kind: "number",
        min: 5,
        max: 95,
      },
      {
        path: "y",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.points.y",
          message: "y",
        },
        kind: "number",
        min: 5,
        max: 95,
      },
      {
        path: "clusterId",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.points.clusterId",
          message: "clusterId",
        },
        kind: "select",
        optionsFrom: {
          path: "clusters",
          valueKey: "id",
          labelKey: "label",
        },
      },
    ],
  },
  {
    path: "clusters",
    label: {
      id: "motionAtlas.map-cluster-unfold.controls.clusters",
      message: "clusters",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: z.toJSONSchema(inputSchema.shape.clusters.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.clusters.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.clusters.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "x",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.clusters.x",
          message: "x",
        },
        kind: "number",
        min: 10,
        max: 90,
      },
      {
        path: "y",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.clusters.y",
          message: "y",
        },
        kind: "number",
        min: 10,
        max: 90,
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.map-cluster-unfold.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "points",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.labels.points",
          message: "points",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "clusters",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.labels.clusters",
          message: "clusters",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "total",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.labels.total",
          message: "total",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
    ],
  },
  {
    path: "showMemberIds",
    label: {
      id: "motionAtlas.map-cluster-unfold.controls.showMemberIds",
      message: "showMemberIds",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.map-cluster-unfold.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "context",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.copy.context",
          message: "context",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
      {
        path: "before",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.copy.before",
          message: "before",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
      {
        path: "after",
        label: {
          id: "motionAtlas.map-cluster-unfold.controls.copy.after",
          message: "after",
        },
        kind: "text",
        minLength: 1,
        maxLength: 40,
      },
    ],
  },
];
