import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The authored boundary turns and closes only the distribution outlet. */
export function RevenueTerm({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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

/** The term boundary's handle, turning a quarter to close the outlet. */
function TermTurn({
  x,
  y,
  turning,
}: Readonly<{ x: number; y: number; turning: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g
      data-term-turn="true"
      transform={`translate(${x} ${y}) rotate(${mix(turning, 0, 90)})`}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M-18 0 H18 M0 -18 V18" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M-16 -18 Q24 -18 24 12" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        fill="none"
      />
    </g>
  );
}
