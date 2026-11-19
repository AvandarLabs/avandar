import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
    x: mix(binding, 110, isStack ? 80 + index * 12 : 64),
    y: mix(
      binding,
      148 + index * 124,
      (isStack ? 136 : 128) + index * (isStack ? 124 : 138),
    ),
    margins: motion.ramp(frame, 38, motion.scale(66), motion.travel.easing),
  };
}
