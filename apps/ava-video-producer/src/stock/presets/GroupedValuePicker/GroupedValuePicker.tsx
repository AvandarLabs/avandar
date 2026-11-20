import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPickedValueFromInput } from "./getPickedValueFromInput";
import { controls } from "./GroupedValuePicker.controls";
import { PickerCalculation } from "./PickerCalculation";
import { PickerObservation } from "./PickerObservation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** Frames the derived result takes to slide into place. */
const ATTACH_FRAMES = 33;
/** The derived result card's corner before the corner style scales it. */
const RESULT_CORNER = 6;
function _getSelectLabel({
  path,
  value,
}: {
  path: string;
  value: string;
}): string {
  const control = controls.find(propEq("path", path));
  if (control?.kind !== "select" || !("options" in control)) {
    throw new Error("Picker select control is missing.");
  }
  const option = control.options.find(propEq("value", value));
  if (!option) {
    throw new Error("Picker select option is missing.");
  }
  return option.label.message;
}
/**
 * A selected aggregation rule produces one nullable field from retained rows.
 */
export function GroupedValuePicker({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const value = getPickedValueFromInput(input),
    attachment = ramp(
      frame,
      106,
      motion.scale(ATTACH_FRAMES),
      motion.travel.easing,
    );
  const rounded =
    value === null
      ? null
      : input.rule === "mean"
        ? Number(value.toFixed(2))
        : value;
  const result =
    value === null
      ? input.labels.missing
      : rounded !== value
        ? `≈ ${rounded}`
        : String(value);
  const unit =
    input.rule === "count" ? input.labels.countUnit : input.labels.unit;
  return (
    <g>
      <LabelSlots
        labels={[
          [input.labels.entity, 48, 35, 864, 18, 1],
          [input.labels.field, 48, 80, 864, 16, 1],
          [
            _getSelectLabel({ path: "rule", value: input.rule }),
            48,
            120,
            390,
            14,
            2,
          ],
          [
            _getSelectLabel({ path: "nullPolicy", value: input.nullPolicy }),
            490,
            120,
            422,
            14,
            2,
          ],
        ]}
      />
      {input.observations.map((observation, index) => {
        return (
          <PickerObservation
            key={observation.id}
            input={input}
            index={index}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <g
        data-exact-result={value === null ? "null" : value}
        data-result-unit={value === null ? "" : unit}
        opacity={attachment}
        transform={`translate(${mix(attachment, 25, 0)} 0)`}
      >
        <StockRect
          data-derived-result="true"
          x={645}
          y={340}
          width={267}
          height={195}
          rx={scales.corner(RESULT_CORNER)}
          fill={tokens.color.elevated}
          stroke={accent}
        />
        <LabelSlots
          labels={[
            [input.labels.result, 660, 365, 237, 14, 3],
            [result, 660, 422, 237, 20, 3],
          ]}
        />
        {value !== null ? (
          <LabelSlots labels={[[unit, 660, 495, 237, 14, 3]]} />
        ) : null}
      </g>
      {input.showCalculation ? (
        <PickerCalculation input={input} frame={frame} accent={accent} />
      ) : null}
    </g>
  );
}
