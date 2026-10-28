import { STOCK } from "../../stockPalette";
import { GapEmphasis } from "./GapEmphasis";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
type Props = {
  householdId: string;
  index: number;
  railY: number;
  color: string;
  covered: boolean;
  progress: number;
  gapEmphasis: Input["gapEmphasis"];
};
/** Keyed house silhouettes use outline or hatched gap emphasis. */
export function HouseholdGlyph({
  householdId,
  index,
  railY,
  color,
  covered,
  progress,
  gapEmphasis,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d={`M630 ${railY - 1} l8 -7 l8 7 v10 h-16 Z`}
        fill={STOCK.surface}
        stroke={color}
      />
      <text
        x={638}
        y={railY + 6}
        fontSize={12}
        textAnchor="middle"
        fill={STOCK.text}
      >
        {index + 1}
      </text>
      <GapEmphasis
        householdId={householdId}
        railY={railY}
        covered={covered}
        progress={progress}
        gapEmphasis={gapEmphasis}
      />
    </g>
  );
}
