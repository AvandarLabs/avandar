import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { x: number; y: number; awning: number; accent: string };
/** One persistent vehicle folds and unfolds its awning around the drive. */
export function ClinicVehicle({
  x,
  y,
  awning,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
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
      <VehicleWheel cx={-26} />
      <VehicleWheel cx={28} />
      <path
        data-awning="clinic"
        d={`M-42 -22 H20 L${20 + awning * 10} ${-22 - awning * 22} H${-42 - awning * 10} Z`}
        fill={accent}
        opacity={atomic.opacity["55"]}
      />
    </g>
  );
}

function VehicleWheel({ cx }: Readonly<{ cx: number }>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "circle", cx, cy: 20, r: 7 }}
      profile={tokens.sketch.shape}
      fill={tokens.color.ground}
      stroke={tokens.color.inactive}
    />
  );
}
