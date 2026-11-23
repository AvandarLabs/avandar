import { propEq, prop } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Hand contact follows the edge of the actively turning slip. */
export function ConsentTurningHand({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const withdrawn = input.permissions.filter(prop("withdrawn"));
  const activeIndex = Math.min(
    withdrawn.length - 1,
    Math.max(0, Math.floor((frame - 36) / 8)),
  );
  const activeTurn = motion.ramp(
    frame,
    36 + activeIndex * motion.scaleStagger(8),
    motion.whip,
    motion.entrance.easing,
  );
  const handX = 278 + 230 * (0.12 + 0.88 * Math.abs(2 * activeTurn - 1));
  const targetIndex = input.permissions.findIndex(
    propEq("id", withdrawn[activeIndex]?.id),
  );
  return frame >= 36 && frame < 60 ? (
    <g data-participant-hand="turn">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M200 150 L${handX} ${190 + targetIndex * 102 + 45}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
        strokeLinecap="round"
      />
    </g>
  ) : undefined;
}
