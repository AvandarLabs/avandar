import { Motion } from "../../../../motion";
import { cubicPoint } from "../../../graphics-common/cubicPoint";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DETOUR_CUE, DETOUR_FRAMES } from "../exceptionTiming";
import { MovingExceptionCase } from "./MovingExceptionCase";
import type { Props } from "../ExceptionDetour";
import type { ReactNode } from "react";

/** Frames the case takes to approach the rule. */
const APPROACH_FRAMES = 24;

/** Samples the authored cubic detour on its selected side. */
function _getDetourPoint({
  input,
  travel,
}: Readonly<{ input: Props["input"]; travel: number }>): ReturnType<
  typeof cubicPoint
> {
  const targetY = input.detourSide === "above" ? 180 : 420;
  const point = cubicPoint({
    a: { x: 420, y: 300 },
    b: { x: 560, y: 300 },
    c: { x: 540, y: targetY },
    d: { x: 670, y: targetY },
    t: travel,
  });
  return point;
}

/**
 * One named marker approaches, pauses, and follows the curved exception route.
 */
export function ExceptionCase({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const approach = Motion.ramp({
    frame,
    at: 24,
    dur: motion.scale(APPROACH_FRAMES),
    easing: motion.travel.easing,
  });
  const travel = Motion.ramp({
    frame,
    at: DETOUR_CUE,
    dur: motion.scale(DETOUR_FRAMES),
    easing: motion.travel.easing,
  });
  const point = _getDetourPoint({ input, travel });
  const x =
    frame < DETOUR_CUE
      ? Motion.mix({
          t: approach,
          from: 100,
          to: 420,
        })
      : point.x;
  return (
    <MovingExceptionCase
      frame={frame}
      accent={accent}
      input={input}
      tokens={tokens}
      motion={motion}
      point={point}
      x={x}
    />
  );
}
