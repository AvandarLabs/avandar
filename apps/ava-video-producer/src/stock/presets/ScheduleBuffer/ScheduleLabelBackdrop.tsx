import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  targetX: number;
  index: number;
  x: number;
  slotWidth: number;
  color: string;
};
/** How strongly a label's leader line shows. */
const LEADER_OPACITY = 0.55;
/** A leader connects each external label slot to its own segment. */
export function ScheduleLabelBackdrop({
  targetX,
  index,
  x,
  slotWidth,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${targetX} 371 V${382 + index * 3} L${x + slotWidth / 2} 414`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        strokeOpacity={LEADER_OPACITY}
      />
      <rect
        data-label-slot={index}
        x={x + 4}
        y={418}
        width={slotWidth - 8}
        height={155}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
      />
    </g>
  );
}
