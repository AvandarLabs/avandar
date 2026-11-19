import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  householdId: string;
  x: number;
  y: number;
  color: string;
  covered: boolean;
  progress: number;
};
/** Exact fixed coordinate anchors retain the selected gap rings. */
export function HouseholdAnchor({
  householdId,
  x,
  y,
  color,
  covered,
  progress,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      <circle data-home-anchor={householdId} cx={x} cy={y} r={3} fill={color} />
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: 8 }}
        profile={tokens.sketch.shape}
        data-gap-ring={householdId}
        fill="none"
        stroke={tokens.color.highlight}
        opacity={covered ? 0 : progress}
      />
    </g>
  );
}
