import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";

type Props = {
  component: Input["plannedComponents"][number];
  frame: number;
  index: number;
  foodY: number;
  isServed: boolean;
};
/** Serving Utensil for the authored scene. */
export function ServingUtensil({
  component,
  frame,
  index,
  foodY,
  isServed,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return isServed && frame >= 36 + index * 12 && frame < 50 + index * 12 ? (
    <g
      data-serving-utensil={component.id}
      transform={`translate(-50 ${foodY})`}
      opacity={
        1 -
        motion.ramp(frame, 48 + index * 12, motion.scale(2), motion.exit.easing)
      }
    >
      <SketchedShape
        shape={{ kind: "ellipse", cx: 0, cy: 5, rx: 12, ry: 5 }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.text}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M0 10 V28" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.text}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  ) : undefined;
}
