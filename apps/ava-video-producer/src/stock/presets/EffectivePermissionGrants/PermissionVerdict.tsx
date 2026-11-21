import { Motion } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EffectivePermissionGrantsShared } from "./EffectivePermissionGrantsShared";
import type { ReactNode } from "react";

type Props = {
  label: string;
  frame: number;
};
/** The verdict, appearing once the result has risen. */
export function PermissionVerdict({
  label,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 139,
        dur: motion.scale(EffectivePermissionGrantsShared.VERDICT_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <LabelSlots labels={[[label, 55, 580, 840, 18, 1]]} />
    </g>
  );
}
