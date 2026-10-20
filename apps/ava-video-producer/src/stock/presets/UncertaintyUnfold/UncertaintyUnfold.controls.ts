import type { StockControl } from "../../contracts/StockContract.types";
function _copy({ path, message }: { path: string; message: string }) {
  return { id: `motionAtlas.uncertainty-unfold.controls.${path}`, message };
}
/** Serializable recursive controls preserve the accepted authored bounds. */
export const controls: StockControl[] = [
  {
    path: "estimate",
    label: _copy({ path: "estimate", message: "Estimate" }),
    kind: "object",
    controls: [
      {
        path: "label",
        label: _copy({ path: "estimate.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "point",
        label: _copy({ path: "estimate.point", message: "Point" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "lower",
        label: _copy({ path: "estimate.lower", message: "Lower" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "upper",
        label: _copy({ path: "estimate.upper", message: "Upper" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
    ],
  },
  {
    path: "axis",
    label: _copy({ path: "axis", message: "Axis" }),
    kind: "object",
    controls: [
      {
        path: "min",
        label: _copy({ path: "axis.min", message: "Min" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "max",
        label: _copy({ path: "axis.max", message: "Max" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "unit",
        label: _copy({ path: "axis.unit", message: "Unit" }),
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
  },
  {
    path: "interval",
    label: _copy({ path: "interval", message: "Interval" }),
    kind: "object",
    controls: [
      {
        path: "kind",
        label: _copy({ path: "interval.kind", message: "Kind" }),
        kind: "select",
        options: [
          {
            value: "scenario-range",
            label: _copy({
              path: "interval.kind.scenario-range",
              message: "scenario-range",
            }),
          },
          {
            value: "confidence-interval",
            label: _copy({
              path: "interval.kind.confidence-interval",
              message: "confidence-interval",
            }),
          },
          {
            value: "measurement-range",
            label: _copy({
              path: "interval.kind.measurement-range",
              message: "measurement-range",
            }),
          },
        ],
      },
      {
        path: "label",
        label: _copy({ path: "interval.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 64,
      },
    ],
  },
  {
    path: "reference",
    label: _copy({ path: "reference", message: "Reference" }),
    kind: "object",
    nullable: true,
    controls: [
      {
        path: "value",
        label: _copy({ path: "reference.value", message: "Value" }),
        kind: "number",
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
      },
      {
        path: "label",
        label: _copy({ path: "reference.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "interpretation",
    label: _copy({ path: "interpretation", message: "Interpretation" }),
    kind: "text",
    minLength: 1,
    maxLength: 80,
  },
  {
    path: "showValues",
    label: _copy({ path: "showValues", message: "Show values" }),
    kind: "boolean",
  },
  {
    path: "contextLabel",
    label: _copy({ path: "contextLabel", message: "Context label" }),
    kind: "text",
    minLength: 1,
    maxLength: 64,
  },
];
