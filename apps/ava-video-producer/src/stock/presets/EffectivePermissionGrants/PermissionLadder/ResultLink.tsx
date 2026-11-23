import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PermissionLadderShared } from "./PermissionLadderShared";
import type { ReactNode } from "react";

type Props = {
  requiredY: number;
  resultY: number;
  label: string;
  frame: number;
};
/** The link from the required notch to the result, and the result's label. */
export function ResultLink({
  requiredY,
  resultY,
  label,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const link = Motion.ramp({
    frame,
    at: 132,
    dur: motion.scale(PermissionLadderShared.LINK_FRAMES),
    easing: motion.reveal.easing,
  });
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: `M754 ${requiredY} H770 V${resultY} H776` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        fill="none"
        opacity={link}
      />
      <g opacity={link}>
        <LabelSlots labels={[[label, 720, 488, 185, 16, 4]]} />
      </g>
    </>
  );
}
