import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { PickerValueGroup } from "../getPickerGroupsFromInput";
import type { Input } from "../GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  group: (readonly PickerValueGroup[])[number];
  input: Input;
};

/** Renders the labels with authored geometry. */
export function PickerModeGroupsLabels({
  frame,
  motion,
  group,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 92,
        dur: motion.press.duration,
        easing: motion.reveal.easing,
      })}
    >
      <LabelSlots
        labels={[
          [
            group.value === null ? input.labels.missing : String(group.value),
            group.x + 8,
            group.y + 18,
            156,
            12,
            5,
          ],
        ]}
      />
    </g>
  );
}
