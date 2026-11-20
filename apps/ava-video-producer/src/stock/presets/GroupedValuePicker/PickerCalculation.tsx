import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPickerGroupsFromInput } from "./getPickerGroupsFromInput";
import { PickerFormula } from "./PickerFormula";
import { PickerModeGroups } from "./PickerModeGroups";
import { PickerValueCopy } from "./PickerValueCopy";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Retained source values travel into explicit stacks or a numeric fold. */
export function PickerCalculation({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const groups = getPickerGroupsFromInput(input),
    isMode = input.rule === "most-frequent";
  return (
    <g data-calculation-rule={input.rule}>
      {isMode ? (
        <PickerModeGroups
          input={input}
          groups={groups}
          frame={frame}
          accent={accent}
        />
      ) : (
        <PickerFormula input={input} frame={frame} />
      )}
      {frame >= 56
        ? input.observations.map((observation, index) => {
            return (
              <PickerValueCopy
                key={observation.id}
                input={input}
                index={index}
                frame={frame}
                accent={accent}
                groups={groups}
              />
            );
          })
        : null}
      {input.rule === "count" && frame >= 94 && frame < 105
        ? input.observations
            .filter(({ value }) => {
              return value !== null;
            })
            .map((observation, index) => {
              return (
                <g
                  key={observation.id}
                  opacity={ramp(frame, 94, motion.chip, motion.reveal.easing)}
                >
                  <LabelSlots
                    labels={[["↦ 1", 56 + index * 144, 402, 128, 12, 1]]}
                  />
                </g>
              );
            })
        : null}
    </g>
  );
}
