import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
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
  const { x, y, handX, handY } = getShopperPoseFromInputAndFrame({
    input,
    frame,
  });
  return (
    <g>
      <PersonGlyph x={x} y={y} size={32} color={accent} />
      <path
        data-market-arm
        d={`M${x} ${y} L${x - 12} ${handY + 8} L${handX} ${handY}`}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {frame < 108 ? (
        <path
          data-tender-arm
          d={`M${x} ${y} L${x + 12} ${y + 10}`}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
        />
      ) : undefined}
      <circle data-market-hand cx={handX} cy={handY} r={3.5} fill={accent} />
    </g>
  );
}
