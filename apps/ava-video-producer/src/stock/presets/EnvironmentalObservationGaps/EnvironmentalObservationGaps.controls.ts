import { CELL_CONTROL } from "./EnvironmentalObservationGapsCellControl";
import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive controls preserve literal accepted field bounds. */
export const CONTROLS: StockControl[] = [
  CELL_CONTROL,
  {
    path: "metric",
    label: {
      id: "motionAtlas.environmental-observation-gaps.controls.metric",
      message: "metric",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.metric.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.metric.unit",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "minimum",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.metric.minimum",
          message: "minimum",
        },
        kind: "number",
        min: -1.7976931348623157e308,
        max: 1.7976931348623157e308,
      },
      {
        path: "maximum",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.metric.maximum",
          message: "maximum",
        },
        kind: "number",
        min: -1.7976931348623157e308,
        max: 1.7976931348623157e308,
      },
      {
        path: "cellAreaHa",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.metric.cellAreaHa",
          message: "cellAreaHa",
        },
        kind: "number",
        min: 0,
        max: 1000,
      },
      {
        path: "periodLabel",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.metric.periodLabel",
          message: "periodLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 38,
      },
    ],
    help: {
      id: "motionAtlas.environmental-observation-gaps.controls.metric.help",
      message:
        "Define the measured variable, shared value scale, support area and observation period. Label <= 26, unit <= 12, period <= 38 characters; minimum < maximum, both finite; cell area > 0 and <= 1000 ha. All cells and field checks use this variable and unit.",
    },
  },
  {
    path: "fieldChecks",
    label: {
      id: "motionAtlas.environmental-observation-gaps.controls.fieldChecks",
      message: "fieldChecks",
    },
    kind: "collection",
    minItems: 0,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 0, maxLength: 20 },
        label: { type: "string", minLength: 0, maxLength: 22 },
        cellId: { type: "string", minLength: 0, maxLength: 20 },
        value: {
          type: "number",
          minimum: -1.7976931348623157e308,
          maximum: 1.7976931348623157e308,
        },
      },
      required: ["id", "label", "cellId", "value"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.fieldChecks.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.fieldChecks.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
      },
      {
        path: "cellId",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.fieldChecks.cellId",
          message: "cellId",
        },
        kind: "select",
        optionsFrom: { path: "cells", valueKey: "id", labelKey: "label" },
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.fieldChecks.value",
          message: "value",
        },
        kind: "number",
        min: -1.7976931348623157e308,
        max: 1.7976931348623157e308,
      },
    ],
    help: {
      id: "motionAtlas.environmental-observation-gaps.controls.fieldChecks.help",
      message:
        "Add explicitly point-supported readings at selected cells. 0..3 checks; unique IDs <= 20 characters; labels <= 22; existing cellId; finite value within metric bounds. Point observations never replace the cell value.",
    },
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.environmental-observation-gaps.controls.decision",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.decision.actorLabel",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.decision.actionLabel",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
    help: {
      id: "motionAtlas.environmental-observation-gaps.controls.decision.help",
      message:
        "Name the team and deliberate follow-up action. Strings 1..32 characters; adding a field-check prop means an authored observation, not proof that a visit occurred.",
    },
  },
  {
    path: "context",
    label: {
      id: "motionAtlas.environmental-observation-gaps.controls.context",
      message: "context",
    },
    kind: "select",
    options: [
      {
        value: "globe-and-schematic-tile",
        label: {
          id: "motionAtlas.environmental-observation-gaps.options.context.globe-and-schematic-tile",
          message: "globe-and-schematic-tile",
        },
      },
      {
        value: "schematic-tile",
        label: {
          id: "motionAtlas.environmental-observation-gaps.options.context.schematic-tile",
          message: "schematic-tile",
        },
      },
    ],
    help: {
      id: "motionAtlas.environmental-observation-gaps.controls.context.help",
      message:
        "Choose whether to introduce the local evidence tile with a recognizable globe. Enum only; globe uses built-in continental silhouettes with no location pin or zoom route. The detached tile is never presented as a mapped real place.",
    },
  },
  {
    path: "showCoverageTotals",
    label: {
      id: "motionAtlas.environmental-observation-gaps.controls.showCoverageTotals",
      message: "showCoverageTotals",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.environmental-observation-gaps.controls.showCoverageTotals.help",
      message:
        "Show area with supplied cell readings and area missing those readings. Boolean; area totals derive solely from cell count times cellAreaHa. Point checks do not increase area coverage.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.environmental-observation-gaps.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "map",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.copy.map",
          message: "map",
        },
        kind: "text",
        minLength: 0,
        maxLength: 34,
      },
      {
        path: "observed",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.copy.observed",
          message: "observed",
        },
        kind: "text",
        minLength: 0,
        maxLength: 34,
      },
      {
        path: "missing",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.copy.missing",
          message: "missing",
        },
        kind: "text",
        minLength: 0,
        maxLength: 34,
      },
      {
        path: "fieldCheck",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.copy.fieldCheck",
          message: "fieldCheck",
        },
        kind: "text",
        minLength: 0,
        maxLength: 34,
      },
      {
        path: "pointSupport",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.copy.pointSupport",
          message: "pointSupport",
        },
        kind: "text",
        minLength: 0,
        maxLength: 34,
      },
      {
        path: "areaUnit",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.copy.areaUnit",
          message: "areaUnit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.environmental-observation-gaps.controls.copy.disclaimer",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 48,
      },
    ],
    help: {
      id: "motionAtlas.environmental-observation-gaps.controls.copy.help",
      message:
        "Configure geographic, observation-support and unit captions. Captions <= 34 characters; areaUnit <= 8 and denotes hectares; disclaimer <= 48.",
    },
  },
];
