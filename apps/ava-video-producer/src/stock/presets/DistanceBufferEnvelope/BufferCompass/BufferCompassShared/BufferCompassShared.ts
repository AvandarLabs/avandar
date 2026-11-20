import { type Props } from "./BufferCompassShared.types";
import type { VideoMotion } from "../../../../../videoTheme/createVideoMotion/createVideoMotion";

const RULER_AT = 13;
const RULER_FRAMES = 37;
const SWEEP_AT = 51;
const SWEEP_FRAMES = 54;
const ARM_FADE_AT = 106;
function _getCompassGeometry({
  input,
  frame,
  motion,
}: Readonly<Pick<Props, "input" | "frame"> & { motion: VideoMotion }>) {
  const sweep = motion.ramp(
    frame,
    SWEEP_AT,
    motion.scale(SWEEP_FRAMES),
    motion.travel.easing,
  );
  const x = 48 + input.origin.x * 3.6,
    y = 190 + input.origin.y * 3.6;
  const radius = input.radiusUnits * 3.6;
  const center = { cx: x, cy: y };
  const ruler = {
    x1: x,
    y1: y,
    x2: x + radius * motion.ramp(frame, RULER_AT, motion.scale(RULER_FRAMES)),
    y2: y,
  };
  const arm = {
    x1: x,
    y1: y,
    x2: x + Math.cos(sweep * Math.PI * 2) * radius,
    y2: y + Math.sin(sweep * Math.PI * 2) * radius,
  };
  return { sweep, radius, center, ruler, arm };
}
/** Calculates radius and sweep geometry with the compass animation cues. */
export const BufferCompassShared = {
  /** Returns the animated sweep, radius, center, ruler, and compass arm. */
  getCompassGeometry: _getCompassGeometry,
  /** Frame when the compass arm appears and starts its circular sweep. */
  SWEEP_AT,
  /** Full compass sweep duration in frames at tempo 1. */
  SWEEP_FRAMES,
  /** Frame when the radius ruler starts extending from the origin. */
  RULER_AT,
  /** Radius ruler extension duration in frames at tempo 1. */
  RULER_FRAMES,
  /** Frame when the compass arm starts fading after its sweep. */
  ARM_FADE_AT,
} as const;
