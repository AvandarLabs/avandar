import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  targetX: number;
  index: number;
  x: number;
  slotWidth: number;
  color: string;
};
/** A leader connects each external label slot to its own segment. */
export function ScheduleLabelBackdrop({
  targetX,
  index,
  x,
  slotWidth,
  color,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
        strokeOpacity={atomic.opacity["55"]}
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
