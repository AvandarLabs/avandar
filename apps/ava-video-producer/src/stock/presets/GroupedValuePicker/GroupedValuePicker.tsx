import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPickedValueFromInput } from "./getPickedValueFromInput";
import { controls } from "./GroupedValuePicker.controls";
import { GroupedValuePickerLabels } from "./GroupedValuePickerLabels/GroupedValuePickerLabels";
import { PickerCalculation } from "./PickerCalculation/PickerCalculation";
import { PickerDerivedResult } from "./PickerDerivedResult/PickerDerivedResult";
import { PickerObservation } from "./PickerObservation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type PickerResultCopy = {
  value: number | null;
  attachment: number;
  result: string;
  unit: string;
};

/** Frame-driven authored study props. */
export type Props = GraphicProps & {
  input: Input;
};

type GetPickerResultCopyOptions = {
  frame: number;
  input: Input;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/** The type of `_getSelectLabel` used by GroupedValuePicker. */
export type GroupedValuePickerGetSelectLabelCallable = typeof _getSelectLabel;

/** Result of the authored GroupedValuePicker calculation. */
export type GroupedValuePickerGetPickerResultCopyValue = PickerResultCopy;

/** Frames the derived result takes to slide into place. */
const ATTACH_FRAMES = 33;

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

/** Samples the authored picker result copy. */
function _getPickerResultCopy({
  frame,
  input,
  motion,
}: Readonly<GetPickerResultCopyOptions>): PickerResultCopy {
  const value = getPickedValueFromInput(input),
    attachment = Motion.ramp({
      frame,
      at: 106,
      dur: motion.scale(ATTACH_FRAMES),
      easing: motion.travel.easing,
    });
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
  return { value, attachment, result, unit };
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
  const { value, attachment, result, unit } = _getPickerResultCopy({
    frame,
    input,
    motion,
  });
  return (
    <g>
      <GroupedValuePickerLabels
        input={input}
        _getSelectLabel={_getSelectLabel}
      />
      {input.observations.map((observation, index) => {
        return (
          <PickerObservation
            key={observation.id}
            {...{ input, index, frame, accent }}
          />
        );
      })}
      <PickerDerivedResult
        {...{ input, accent, tokens, scales, value, attachment }}
        result={result}
        unit={unit}
      />
      {input.showCalculation ? (
        <PickerCalculation {...{ input, frame, accent }} />
      ) : null}
    </g>
  );
}
