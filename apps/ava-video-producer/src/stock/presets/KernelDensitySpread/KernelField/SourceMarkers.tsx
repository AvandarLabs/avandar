import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../KernelDensitySpread.schema";
import type { ReactNode } from "react";
/** The fixed observations, drawn above the field and the cones. */
export function SourceMarkers({
  points,
}: Readonly<{ points: Input["points"] }>): ReactNode {
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return points.map((point) => {
    return (
      <SketchedShape
        key={point.id}
        data-point-position={`${point.x},${point.y}`}
        shape={{
          kind: "circle",
          cx: 180 + point.x * 2.8,
          cy: 200 + point.y * 2.8,
          r: 4,
        }}
        profile={sketch.shape}
        fill={color.text}
        stroke={color.ground}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
    );
  });
}
