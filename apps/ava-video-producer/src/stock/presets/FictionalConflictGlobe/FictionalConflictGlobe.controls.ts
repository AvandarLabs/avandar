import { z } from "zod";
import { inputSchema } from "./FictionalConflictGlobe.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors preserve references and explicit nullable bookings. */
export const controls: StockControl[] = [
  {
    path: "incidents",
    label: {
      id: "motionAtlas.fictional-conflict-globe.controls.incidents",
      message: "incidents",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 4,
    itemSchema: z.toJSONSchema(inputSchema.shape.incidents.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.fictional-conflict-globe.controls.incidents.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.fictional-conflict-globe.controls.incidents.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "latitude",
        label: {
          id: "motionAtlas.fictional-conflict-globe.controls.incidents.latitude",
          message: "latitude",
        },
        kind: "number",
        min: -60,
        max: 70,
      },
      {
        path: "longitude",
        label: {
          id: "motionAtlas.fictional-conflict-globe.controls.incidents.longitude",
          message: "longitude",
        },
        kind: "number",
        min: -180,
        max: 180,
      },
    ],
  },
  {
    path: "longitudeSweep",
    label: {
      id: "motionAtlas.fictional-conflict-globe.controls.longitudeSweep",
      message: "longitudeSweep",
    },
    kind: "object",
    controls: [
      {
        path: "start",
        label: {
          id: "motionAtlas.fictional-conflict-globe.controls.longitudeSweep.start",
          message: "start",
        },
        kind: "number",
        min: -180,
        max: 180,
      },
      {
        path: "end",
        label: {
          id: "motionAtlas.fictional-conflict-globe.controls.longitudeSweep.end",
          message: "end",
        },
        kind: "number",
        min: -180,
        max: 180,
      },
    ],
  },
  {
    path: "markerMeaning",
    label: {
      id: "motionAtlas.fictional-conflict-globe.controls.markerMeaning",
      message: "markerMeaning",
    },
    kind: "text",
    minLength: 1,
    maxLength: 36,
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.fictional-conflict-globe.controls.scenarioCaption",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 54,
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.fictional-conflict-globe.controls.showLabels",
      message: "showLabels",
    },
    kind: "boolean",
  },
  {
    path: "showGraticule",
    label: {
      id: "motionAtlas.fictional-conflict-globe.controls.showGraticule",
      message: "showGraticule",
    },
    kind: "boolean",
  },
];
