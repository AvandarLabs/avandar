import { Motion } from "../../../motion";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FocusedQuestion } from "./FocusedQuestion";
import { OutsideCaption } from "./OutsideCaption";
import { ScopeHeading } from "./ScopeHeading";
import type { Props } from "./ScopeAperture";
import type { ReactNode } from "react";

type GetScopeBoundaryBoundsOptions = { contraction: number };

type GetScopeBoundaryBoundsResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * The aperture draws on as one dash over an outline normalised to this length,
 * so it is geometry, not a theme dash.
 */
const DRAW_ON_LENGTH = 1;

/** Samples the authored scope boundary drawing bounds. */
function _getScopeBoundaryBounds(
  contraction: Readonly<Readonly<GetScopeBoundaryBoundsOptions>["contraction"]>,
): GetScopeBoundaryBoundsResult {
  return {
    x: Motion.mix({
      t: contraction,
      from: 60,
      to: 240,
    }),
    y: Motion.mix({
      t: contraction,
      from: 140,
      to: 150,
    }),
    width: Motion.mix({
      t: contraction,
      from: 840,
      to: 480,
    }),
    height: Motion.mix({
      t: contraction,
      from: 380,
      to: 360,
    }),
  };
}

/** The full-field frame contracts around one explicitly authored question. */
export function ScopeBoundary({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const contraction = motion.ramp(
    frame,
    36,
    motion.scale(72),
    motion.travel.easing,
  );
  return (
    <g>
      <ScopeHeading {...{ frame, input, accent, id: "heading" }} />
      <StockRect
        data-aperture="true"
        {..._getScopeBoundaryBounds(contraction)}

        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        pathLength={DRAW_ON_LENGTH}
        strokeDasharray={DRAW_ON_LENGTH}
        strokeDashoffset={
          DRAW_ON_LENGTH * (1 - motion.ramp(frame, 20, motion.scale(16)))
        }
      />
      <FocusedQuestion {...{ frame, input, accent, id: "question" }} />
      <OutsideCaption {...{ frame, input, accent, id: "outside" }} />
    </g>
  );
}
