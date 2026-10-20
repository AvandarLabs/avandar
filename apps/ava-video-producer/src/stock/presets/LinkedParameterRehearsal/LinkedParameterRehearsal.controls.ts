import { z } from "zod";
import { inputSchema } from "./LinkedParameterRehearsal.schema";
import type { StockControl } from "../../contracts/StockContract.types";
function _copy({ path, message }: { path: string; message: string }) {
  return {
    id: `motionAtlas.linked-parameter-rehearsal.controls.${path}`,
    message,
  };
}
/** Serializable recursive controls preserve the accepted authored bounds. */
export const controls: StockControl[] = [
  {
    path: "source",
    label: _copy({ path: "source", message: "Source" }),
    kind: "object",
    controls: [
      {
        path: "label",
        label: _copy({ path: "source.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "baseline",
        label: _copy({ path: "source.baseline", message: "Baseline" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "trial",
        label: _copy({ path: "source.trial", message: "Trial" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "min",
        label: _copy({ path: "source.min", message: "Min" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "max",
        label: _copy({ path: "source.max", message: "Max" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "unit",
        label: _copy({ path: "source.unit", message: "Unit" }),
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
  },
  {
    path: "outputs",
    label: _copy({ path: "outputs", message: "Outputs" }),
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: z.toJSONSchema(inputSchema.shape.outputs.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "outputs.id", message: "Id" }),
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: _copy({ path: "outputs.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "multiplier",
        label: _copy({ path: "outputs.multiplier", message: "Multiplier" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "offset",
        label: _copy({ path: "outputs.offset", message: "Offset" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "min",
        label: _copy({ path: "outputs.min", message: "Min" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "max",
        label: _copy({ path: "outputs.max", message: "Max" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "unit",
        label: _copy({ path: "outputs.unit", message: "Unit" }),
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
  },
  {
    path: "phaseLabels",
    label: _copy({ path: "phaseLabels", message: "Phase labels" }),
    kind: "object",
    controls: [
      {
        path: "baseline",
        label: _copy({ path: "phaseLabels.baseline", message: "Baseline" }),
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "trial",
        label: _copy({ path: "phaseLabels.trial", message: "Trial" }),
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "restored",
        label: _copy({ path: "phaseLabels.restored", message: "Restored" }),
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
    ],
  },
  {
    path: "showRules",
    label: _copy({ path: "showRules", message: "Show rules" }),
    kind: "boolean",
  },
  {
    path: "showBaselineMarkers",
    label: _copy({
      path: "showBaselineMarkers",
      message: "Show baseline markers",
    }),
    kind: "boolean",
  },
  {
    path: "contextLabel",
    label: _copy({ path: "contextLabel", message: "Context label" }),
    kind: "text",
    minLength: 1,
    maxLength: 72,
  },
];
