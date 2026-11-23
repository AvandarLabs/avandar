import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPickerGroupsFromInput } from "../getPickerGroupsFromInput";
import { PickerCalculationResult } from "./PickerCalculationResult";
import type { Input } from "../GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

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
      <PickerCalculationResult
        input={input}
        frame={frame}
        accent={accent}
        groups={groups}
        isMode={isMode}
      />
      {input.rule === "count" && frame >= 94 && frame < 105
        ? input.observations
            .filter(({ value }) => {
              return value !== null;
            })
            .map((observation, index) => {
              return (
                <g
                  key={observation.id}
                  opacity={Motion.ramp({
                    frame,
                    at: 94,
                    dur: motion.chip,
                    easing: motion.reveal.easing,
                  })}
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
