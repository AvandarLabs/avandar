import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: `M630 ${railY - 1} l8 -7 l8 7 v10 h-16 Z` }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={color}
      />
      <text
        x={638}
        y={railY + 6}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
        textAnchor="middle"
        fill={tokens.color.text}
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
