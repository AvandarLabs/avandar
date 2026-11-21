import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PickerFrequencyBay } from "./PickerFrequencyBay/PickerFrequencyBay";
import type { PickerValueGroup } from "./getPickerGroupsFromInput";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  groups: readonly PickerValueGroup[];
  frame: number;
  accent: string;
};
/** Frames the bays take to fade in. */
const BAY_FRAMES = 14;
/** Disjoint frequency bays retain full group labels and counted value marks. */
export function PickerModeGroups({
  input,
  groups,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 56,
        dur: motion.scale(BAY_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      {groups.map((group) => {
        return (
          <PickerFrequencyBay
            key={String(group.value)}
            {...{ input, frame, accent, tokens, scales, motion, group }}
          />
        );
      })}
    </g>
  );
}
