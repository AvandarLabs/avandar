import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RegistrationAxes } from "./RegistrationAxes";
import type { ReactNode } from "react";

type Props = { x: number; index: number; frame: number };
const TICKS_AT = 13;
const TICKS_FRAMES = 39;
/**
 * A fixed numeric square gives coordinate representations a stable reference.
 */
export function RegistrationGrid({
  x,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  return (
    <g>
      <StockRect
        data-grid-ground={index}
        x={x}
        y={185}
        width={240}
        height={240}
        fill="none"
        stroke={color.line}
        strokeWidth={hairline}
      />
      {[0, 1, 2, 3, 4].map((tick) => {
        return (
          <SketchedShape
            key={tick}
            shape={{
              kind: "path",
              d: `M${x + tick * 60} 185 V425 M${x} ${185 + tick * 60} H${x + 240}`,
            }}
            profile={sketch.shape}
            stroke={color.line}
            strokeWidth={hairline}
            opacity={motion.ramp(frame, TICKS_AT, motion.scale(TICKS_FRAMES))}
          />
        );
      })}
      <RegistrationAxes x={x} index={index} />
    </g>
  );
}
