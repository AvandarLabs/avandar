import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { frame: number };
/** The hinged lid opens after casting and stays open throughout extraction. */
export function BallotBox({ frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const lift = 48 * motion.ramp(frame, 76, motion.whip, motion.travel.easing);
  return (
    <g
      data-ballot-box="shared"
      opacity={
        1 - motion.ramp(frame, 108, motion.press.duration, motion.exit.easing)
      }
    >
      <StockRect
        x={420}
        y={250}
        width={120}
        height={64}
        rx={scales.corner(6)}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
      />
      <path d="M424 252 h112 v12 H424 Z" fill={tokens.color.ground} />
      <polygon
        points={`420,250 540,${250 - lift} 540,${264 - lift} 420,264`}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M440 ${257 - lift / 6} L520 ${257 - (lift * 5) / 6}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    </g>
  );
}
