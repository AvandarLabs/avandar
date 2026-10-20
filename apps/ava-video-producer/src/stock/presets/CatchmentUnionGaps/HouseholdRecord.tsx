import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { HouseholdAnchor } from "./HouseholdAnchor";
import { HouseholdGlyph } from "./HouseholdGlyph";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
type Props = {
  household: Input["households"][number];
  index: number;
  progress: number;
  accent: string;
  gapEmphasis: Input["gapEmphasis"];
  covered: boolean;
};
/**
 * One fixed anchor and one clear keyed glyph belong to each supplied household.
 */
export function HouseholdRecord({
  household,
  index,
  progress,
  accent,
  gapEmphasis,
  covered,
}: Readonly<Props>): ReactNode {
  const x = 70 + household.x * 4.8;
  const y = 160 + household.y * 2.8;
  const railY = 154 + index * 26;
  const color = covered ? accent : STOCK.orange;
  return (
    <g data-household={household.id} data-covered-home={covered}>
      <path
        d={`M${x} ${y} L610 ${railY} L628 ${railY}`}
        fill="none"
        stroke={color}
        strokeOpacity={0.22}
      />
      <HouseholdAnchor
        householdId={household.id}
        x={x}
        y={y}
        color={color}
        covered={covered}
        progress={progress}
      />
      <HouseholdGlyph
        householdId={household.id}
        index={index}
        railY={railY}
        color={color}
        covered={covered}
        progress={progress}
        gapEmphasis={gapEmphasis}
      />
      <LabelSlots labels={[[household.label, 660, railY + 4, 282, 12, 1]]} />
    </g>
  );
}
