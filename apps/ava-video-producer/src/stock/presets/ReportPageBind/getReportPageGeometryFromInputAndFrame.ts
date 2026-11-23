import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ReportPageBind.schema";
/**
 * Both first-page header and section paper share the same physical position.
 */
export function getReportPageGeometryFromInputAndFrame({
  input,
  frame,
  index,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  index: number;
  motion: VideoMotion;
}>): {
  x: number;
  y: number;
  margins: number;
} {
  const binding = motion.ramp(
    frame,
    104,
    motion.scale(32),
    motion.travel.easing,
  );
  const isStack = input.finalView === "stack";
  return {
    x: Motion.mix({
      t: binding,
      from: 110,
      to: isStack ? 80 + index * 12 : 64,
    }),
    y: Motion.mix({
      t: binding,
      from: 148 + index * 124,
      to: (isStack ? 136 : 128) + index * (isStack ? 124 : 138),
    }),
    margins: motion.ramp(frame, 38, motion.scale(66), motion.travel.easing),
  };
}
