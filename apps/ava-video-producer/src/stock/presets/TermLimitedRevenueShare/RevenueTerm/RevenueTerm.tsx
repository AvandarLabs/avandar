import { mix } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { TermTurn } from "./TermTurn";
import type { Input } from "../TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The authored boundary turns and closes only the distribution outlet. */
export function RevenueTerm({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const turning = motion.ramp(
    frame,
    66,
    motion.scale(29),
    motion.travel.easing,
  );
  const x = input.arrangementLayout === "stacked" ? 590 : 460;
  const y = input.arrangementLayout === "stacked" ? 240 : 355;
  return (
    <g>
      <TermTurn x={x} y={y} turning={turning} />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x - 15} ${y + 32} L${x + 15} ${y + 32 - mix(turning, 28, 0)}`,
        }}
        profile={tokens.sketch.shape}
        data-outlet="distribution"
        data-closed={turning === 1}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(5)}
      />
      <LabelSlots
        labels={[
          [
            input.arrangement.termBoundaryLabel,
            input.arrangementLayout === "stacked" ? 640 : 480,
            y + 10,
            input.arrangementLayout === "stacked" ? 260 : 420,
            14,
            4,
          ],
        ]}
      />
    </g>
  );
}
