import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  district: Input["districts"][number];
  index: number;
  frame: number;
  isPossible: boolean;
  accent: string;
};
/** Polygon boundaries connect to the corresponding lifted legend key. */
export function DistrictFootprint({
  district,
  index,
  frame,
  isPossible,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const connectorY =
    120 +
    index * 40 -
    (isPossible ? 8 * motion.ramp(frame, 60, motion.scale(36)) : 0);
  return (
    <g>
      <polygon
        data-district={district.id}
        points={district.polygon
          .map(([x, y]) => {
            return `${50 + x * 3.6},${140 + y * 3.6}`;
          })
          .join(" ")}
        fill={index % 2 ? tokens.color.accentAlt : accent}
        fillOpacity={scales.wash(tokens.alpha.wash)}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${50 + district.polygon[0][0] * 3.6} ${140 + district.polygon[0][1] * 3.6} L430 ${connectorY} H474`,
        }}
        profile={tokens.sketch.shape}
        data-district-connector={district.id}
        fill="none"
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(0.8)}
      />
    </g>
  );
}
