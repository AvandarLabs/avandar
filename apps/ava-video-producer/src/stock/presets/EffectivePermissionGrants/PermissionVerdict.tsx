import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EffectivePermissionGrantsShared } from "./EffectivePermissionGrantsShared/EffectivePermissionGrantsShared";
import type { ReactNode } from "react";
/** The verdict, appearing once the result has risen. */
export function PermissionVerdict({
  label,
  frame,
}: Readonly<{ label: string; frame: number }>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={ramp(
        frame,
        139,
        motion.scale(EffectivePermissionGrantsShared.VERDICT_FRAMES),
        motion.reveal.easing,
      )}
    >
      <LabelSlots labels={[[label, 55, 580, 840, 18, 1]]} />
    </g>
  );
}
