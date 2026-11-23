import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LocationPin } from "./LocationPin";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  location: Input["locations"][number];
  index: number;
  showFootprint: boolean;
  isFocused: boolean;
  frame: number;
  accent: string;
};
/**
 * Coincident pins retain separate keyed callouts without moving their disks.
 */
export function UncertainLocation({
  location,
  index,
  showFootprint,
  isFocused,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const x = 50 + location.x * 3.6,
    y = 140 + location.y * 3.6;
  return (
    <g>
      {showFootprint ? (
        <SketchedShape
          shape={{
            kind: "circle",
            cx: x,
            cy: y,
            r: location.radius * 3.6 * motion.ramp(frame, 36, motion.scale(48)),
          }}
          profile={tokens.sketch.shape}
          data-footprint={location.id}
          fill={accent}
          fillOpacity={scales.wash(tokens.alpha.tint)}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.outline)}
        />
      ) : undefined}
      <LocationPin
        location={location}
        index={index}
        x={x}
        y={y}
        isFocused={isFocused}
        accent={accent}
      />
    </g>
  );
}
