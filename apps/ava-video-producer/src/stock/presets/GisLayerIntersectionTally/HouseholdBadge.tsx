import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./GisLayerIntersectionTally.schema";
import type { ReactNode } from "react";

type Props = {
  household: Input["households"][number];
  index: number;
  frame: number;
  isSelected: boolean;
  x: number;
  y: number;
  accent: string;
};
/** Household Badge for the authored scene. */
export function HouseholdBadge({
  household,
  index,
  frame,
  isSelected,
  x,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g
      data-household-marker={household.id}
      data-selected-household={
        isSelected && frame >= 108 ? household.id : undefined
      }
      transform={`translate(${x} ${y})`}
    >
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 0, r: 11 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={isSelected ? accent : tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <FitText
        text={String(index + 1)}
        x={0}
        y={4}
        width={20}
        fontSize={12}
        maxLines={1}
        anchor="middle"
        normalizeWhitespace
      />
    </g>
  );
}
