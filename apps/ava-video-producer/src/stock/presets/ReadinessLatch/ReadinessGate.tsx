import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { horizontal: boolean; allReady: boolean; frame: number };
/** The gate sections' line weight, before the theme's line weight scale. */
const GATE_WIDTH = 5;
/** Two solid gate sections separate to clear the full result's passage. */
export function ReadinessGate({
  horizontal,
  allReady,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const gate = {
    profile: tokens.sketch.shape,
    stroke: tokens.color.highlight,
    strokeWidth: scales.stroke(GATE_WIDTH),
  };
  const opening = allReady
    ? motion.ramp(frame, 122, motion.whip, motion.travel.easing)
    : 0;
  const halfGap = opening * (horizontal ? 40 : 132);
  const before = horizontal
    ? { x1: 650, x2: 650, y1: 110, y2: 500 - halfGap }
    : { x1: 12, x2: 150 - halfGap, y1: 400, y2: 400 };
  const after = horizontal
    ? { x1: 650, x2: 650, y1: 500 + halfGap, y2: 548 }
    : { x1: 150 + halfGap, x2: 930, y1: 400, y2: 400 };
  const hinge = {
    cx: horizontal ? 650 : mix(opening, 150, 18),
    cy: horizontal ? mix(opening, 500, 460) : 400,
    r: 4,
    fill: tokens.color.highlight,
  };
  return (
    <g opacity={motion.reveal(frame, 20)}>
      <SketchedShape
        data-gate="before"
        shape={{ kind: "line", ...before }}
        {...gate}
      />
      <SketchedShape
        data-gate="after"
        shape={{ kind: "line", ...after }}
        {...gate}
      />
      <circle {...hinge} />
    </g>
  );
}
