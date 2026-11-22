import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { makeRegisteredLandmarksFromInputAndFrame } from "../makeRegisteredLandmarksFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  point: ReturnType<typeof makeRegisteredLandmarksFromInputAndFrame>[number];
};

/** One reference site: its leader, fixed target ring, and source ghost. */
export function RegistrationReference({ point }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const hairline = shapes.stroke(stroke.hairline);
  return (
    <g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${555 + point.targetX * 2.4} ${185 + point.targetY * 2.4} L${54 + point.index * 220} 432`,
        }}
        profile={sketch.shape}
        stroke={color.line}
        strokeDasharray={atomic.dash.short.join(" ")}
        fill="none"
        strokeWidth={hairline}
      />
      <SketchedShape
        data-stationary-target={point.id}
        shape={{
          kind: "circle",
          cx: 555 + point.targetX * 2.4,
          cy: 185 + point.targetY * 2.4,
          r: 10 + point.index * 2,
        }}
        profile={sketch.shape}
        fill="none"
        stroke={color.positive}
        strokeWidth={hairline}
      />
      <circle
        cx={65 + point.x * 2.4}
        cy={185 + point.y * 2.4}
        r={5}
        fill={color.inactive}
        fillOpacity={atomic.opacity["30"]}
      />
    </g>
  );
}
