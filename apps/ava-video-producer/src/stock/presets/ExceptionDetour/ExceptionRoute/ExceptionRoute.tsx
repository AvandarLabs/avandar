import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ExceptionCondition } from "../ExceptionCondition";
import { ExceptionOutcome } from "../ExceptionOutcome";
import { DETOUR_CUE, DETOUR_FRAMES, RESOLVED_CUE } from "../exceptionTiming";
import { ResolvedBracket } from "./ResolvedBracket";
import type { Props } from "../ExceptionDetour";
import type { ReactNode } from "react";
/** The route's normalized path length, which its draw-on dash spans. */
const ROUTE_LENGTH = 1;
/**
 * The exception's condition and outcome remain separate from the normal rule.
 */
export function ExceptionRoute({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const targetY = input.detourSide === "above" ? 180 : 420;
  const reveal = Motion.ramp({
    frame,
    at: 48,
    dur: motion.hero,
    easing: motion.reveal.easing,
  });
  const path = `M420 300 C560 300 540 ${targetY} 670 ${targetY}`;
  return (
    <g opacity={reveal}>
      <g data-exception-route="true">
        <SketchedShape
          shape={{ kind: "path", d: path }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.highlight}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          pathLength={ROUTE_LENGTH}
          strokeDasharray={ROUTE_LENGTH}
          strokeDashoffset={
            ROUTE_LENGTH *
            (1 -
              Motion.ramp({
                frame,
                at: DETOUR_CUE,
                dur: motion.scale(DETOUR_FRAMES),
                easing: motion.entrance.easing,
              }))
          }
        />
      </g>
      <ExceptionCondition {...{ input, targetY }} />
      <ExceptionOutcome {...{ input, targetY, accent }} />
      <ResolvedBracket frame={frame} targetY={targetY} />
    </g>
  );
}
