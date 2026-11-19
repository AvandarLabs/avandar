import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  location: Input["locations"][number];
  accent: string;
};

const DISTANCE_DASH = "3 4";
/** Source geometry remains fixed regardless of the chosen radius. */
export function BufferSourceMarker({
  input,
  location,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const hairline = shapes.stroke(stroke.hairline);
  const center = { cx: 48 + location.x * 3.6, cy: 190 + location.y * 3.6 };
  const distance = Math.hypot(
    location.x - input.origin.x,
    location.y - input.origin.y,
  );
  return (
    <g>
      {input.showDistances ? (
        <SketchedShape
          shape={{
            kind: "line",
            x1: 48 + input.origin.x * 3.6,
            y1: 190 + input.origin.y * 3.6,
            x2: center.cx,
            y2: center.cy,
          }}
          profile={sketch.shape}
          stroke={color.line}
          strokeDasharray={DISTANCE_DASH}
          strokeWidth={hairline}
        />
      ) : undefined}
      <SketchedShape
        data-location-position={`${location.x},${location.y}`}
        shape={{ kind: "circle", ...center, r: 5 }}
        profile={sketch.shape}
        fill={distance <= input.radiusUnits ? accent : color.highlight}
        stroke={color.ground}
        strokeWidth={hairline}
      />
    </g>
  );
}
