import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
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
  return (
    <g
      data-household-marker={household.id}
      data-selected-household={
        isSelected && frame >= 108 ? household.id : undefined
      }
      transform={`translate(${x} ${y})`}
    >
      <circle
        r={11}
        fill={STOCK.surface}
        stroke={isSelected ? accent : STOCK.muted}
        strokeWidth={2}
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
