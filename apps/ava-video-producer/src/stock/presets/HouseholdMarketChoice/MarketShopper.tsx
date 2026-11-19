import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getShopperPoseFromInputAndFrame } from "./getShopperPoseFromInputAndFrame";
import type { Input } from "./HouseholdMarketChoice.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** A connected arm and hand make product selection and release physical. */
export function MarketShopper({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const { x, y, handX, handY } = getShopperPoseFromInputAndFrame({
    motion,
    input,
    frame,
  });
  return (
    <g>
      <PersonGlyph x={x} y={y} size={32} color={accent} />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y} L${x - 12} ${handY + 8} L${handX} ${handY}`,
        }}
        profile={tokens.sketch.shape}
        data-market-arm
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(2.5)}
        strokeLinecap="round"
      />
      {frame < 108 ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${x} ${y} L${x + 12} ${y + 10}` }}
          profile={tokens.sketch.shape}
          data-tender-arm
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(2.5)}
        />
      ) : undefined}
      <circle data-market-hand cx={handX} cy={handY} r={3.5} fill={accent} />
    </g>
  );
}
