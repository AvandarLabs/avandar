import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ExceptionCondition } from "./ExceptionCondition";
import { ExceptionOutcome } from "./ExceptionOutcome";
import { DETOUR_CUE, DETOUR_FRAMES, RESOLVED_CUE } from "./exceptionTiming";
import type { Props } from "./ExceptionDetour";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const targetY = input.detourSide === "above" ? 180 : 420;
  const reveal = ramp(frame, 48, motion.hero, motion.reveal.easing);
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
              ramp(
                frame,
                DETOUR_CUE,
                motion.scale(DETOUR_FRAMES),
                motion.entrance.easing,
              ))
          }
        />
      </g>
      <ExceptionCondition {...{ input, targetY }} />
      <ExceptionOutcome {...{ input, targetY, accent }} />
      <ResolvedBracket frame={frame} targetY={targetY} />
    </g>
  );
}

/** The bracket that closes around the case once it is resolved. */
function ResolvedBracket({
  frame,
  targetY,
}: Readonly<{ frame: number; targetY: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g data-resolved-bracket="true">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M92 ${targetY - 36} h-12 v114 h12 M922 ${targetY - 36} h12 v114 h-12 M80 516 v62 h854 v-62`,
        }}
        profile={tokens.sketch.shape}
        opacity={motion.reveal(frame, RESOLVED_CUE)}
        stroke={tokens.color.highlight}
        fill="none"
      />
    </g>
  );
}
