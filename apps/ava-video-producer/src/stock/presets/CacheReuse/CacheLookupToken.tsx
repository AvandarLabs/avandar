import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  frame: number;
  input: Input;
  accent: string;
};
/** Frames the carried result takes to appear or fade. */
const RESULT_FADE_FRAMES = 4;

/** A request key returns with a result impression only after retrieval. */
export function CacheLookupToken({
  x,
  y,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const hasResult =
    (frame >= 60 && frame <= 92) || (frame >= 120 && frame <= 138);
  return (
    <g>
      <circle
        data-lookup-token={input.request.key}
        cx={x}
        cy={y}
        r={8}
        fill={accent}
      />
      {hasResult ? (
        <CarriedResult x={x} y={y} frame={frame} input={input} />
      ) : undefined}
    </g>
  );
}

/** The result impression a returning key carries, fading in and out. */
function CarriedResult({
  x,
  y,
  frame,
  input,
}: Readonly<Omit<Props, "accent">>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  return (
    <g data-carried-result={input.result.value} aria-label={input.result.label}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 14} ${y - 12} h20 v24 h-20 Z M${x + 18} ${y - 5} h12 M${x + 18} ${y + 1} h12 M${x + 18} ${y + 7} h8`,
        }}
        profile={tokens.sketch.shape}
        opacity={_getResultOpacity(frame, motion)}
        fill={tokens.color.surface}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
    </g>
  );
}

/** The result's fade over the first return, then over the second. */
function _getResultOpacity(frame: number, motion: VideoMotion): number {
  const fade = motion.scale(RESULT_FADE_FRAMES);
  return frame < 102
    ? ramp(frame, 60, fade, motion.reveal.easing) *
        (1 - ramp(frame, 88, 92 - 88, motion.exit.easing))
    : ramp(frame, 120, fade, motion.reveal.easing) *
        (1 - ramp(frame, 134, 138 - 134, motion.exit.easing));
}
