import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  zoneId: string;
  points: string;
  lift: number;
  accent: string;
  opacity: number;
};
/**
 * A shallow lid retains its exact polygon while changing shade under a new
 * unit.
 */
export function ZoneSurface({
  zoneId,
  points,
  lift,
  accent,
  opacity,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-lifted-zone={zoneId} transform={`translate(0 ${-lift})`}>
      <g data-zone-shade={zoneId}>
        <SketchedShape
          shape={{ kind: "path", d: `M${points} Z` }}
          profile={tokens.sketch.shape}
          fill={accent}
          fillOpacity={opacity}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.outline)}
        />
      </g>
    </g>
  );
}
