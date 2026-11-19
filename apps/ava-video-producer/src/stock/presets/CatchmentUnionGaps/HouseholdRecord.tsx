import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
const LEADER_OPACITY = 0.22;
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
  const tokens = useGraphicTokens();
  const x = 70 + household.x * 4.8;
  const y = 160 + household.y * 2.8;
  const railY = 154 + index * 26;
  const color = covered ? accent : tokens.color.highlight;
  return (
    <g data-household={household.id} data-covered-home={covered}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x} ${y} L610 ${railY} L628 ${railY}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        strokeOpacity={LEADER_OPACITY}
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
