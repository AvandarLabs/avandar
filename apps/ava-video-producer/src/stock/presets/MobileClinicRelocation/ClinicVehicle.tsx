import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** How strongly the folding awning shows. */
const AWNING_OPACITY = 0.55;
type Props = { x: number; y: number; awning: number; accent: string };
/** One persistent vehicle folds and unfolds its awning around the drive. */
export function ClinicVehicle({
  x,
  y,
  awning,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g
      data-clinic="vehicle"
      data-x={x}
      data-y={y}
      transform={`translate(${x} ${y})`}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M-42 -21 H23 L42 -3 V18 H-42 Z" }}
        profile={tokens.sketch.shape}
        fill={tokens.color.elevated}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <path d="M25 -15 L35 -3 H25 Z" fill={tokens.color.accentAlt} />
      <SketchedShape
        shape={{ kind: "path", d: "M-16 -11 V9 M-26 -1 H-6" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: -26, cy: 20, r: 7 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.ground}
        stroke={tokens.color.inactive}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: 28, cy: 20, r: 7 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.ground}
        stroke={tokens.color.inactive}
      />
      <path
        data-awning="clinic"
        d={`M-42 -22 H20 L${20 + awning * 10} ${-22 - awning * 22} H${-42 - awning * 10} Z`}
        fill={accent}
        opacity={AWNING_OPACITY}
      />
    </g>
  );
}
