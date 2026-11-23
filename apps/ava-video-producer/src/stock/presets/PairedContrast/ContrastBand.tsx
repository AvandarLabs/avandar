import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  criterionId: string;
  y: number;
  frame: number;
  accent: string;
};
/** Frames the focus band takes to expand across the pair. */
const FOCUS_FRAMES = 24;
/**
 * The authored focus expands across the existing pair without removing rows.
 */
export function ContrastBand({
  criterionId,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const focus = Motion.ramp({
    frame,
    at: 96,
    dur: motion.scale(FOCUS_FRAMES),
    easing: motion.travel.easing,
  });
  const width = Motion.mix({
    t: focus,
    from: 168,
    to: 848,
  });
  const band = { x: 480 - width / 2, y: y - 30, width, height: 100 };
  return (
    <g>
      <StockRect
        data-comparison-band={criterionId}
        {...band}
        rx={scales.corner(tokens.corner.card)}
        fill={accent}
        fillOpacity={scales.wash(tokens.alpha.wash) * focus}
        stroke={accent}
        strokeOpacity={focus}
      />
      <SketchedShape
        shape={{ kind: "line", x1: 80, x2: 880, y1: y + 70, y2: y + 70 }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        opacity={focus}
      />
    </g>
  );
}
