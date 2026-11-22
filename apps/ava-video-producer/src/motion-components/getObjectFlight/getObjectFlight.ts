import type { MotionRect } from "../getOverlayTimings";
import { MotionSettings } from "../MotionSettings/MotionSettings";
import type {
  MotionOptions,
  MotionSettingsTheme,
} from "../MotionSettings/MotionSettings";
/**
 * Authored cutout and its departure vector, in the parent SVG's coordinates.
 */
export type ObjectFlight = {
  at: number;
  duration: number;
  dx: number;
  dy: number;
  rect: MotionRect;
  motion?: MotionOptions;
};
/** A departing object's offset, opacity, and whether it is still moving. */
export type ObjectFlightPose = {
  x: number;
  y: number;
  opacity: number;
  active: boolean;
};
/**
 * Deterministic departure geometry, travelling on the theme's cubic in-out
 * unless the flight names a curve. Its active flag can drive DiagramCamera
 * blurActive.
 */
export function getObjectFlight({
  flight,
  frame,
  theme = MotionSettings.getClassicMotionSettingsTheme(),
}: Readonly<{
  flight: ObjectFlight;
  frame: number;
  theme?: MotionSettingsTheme;
}>): ObjectFlightPose {
  if (frame < flight.at) {
    return { x: 0, y: 0, opacity: 1, active: false };
  }
  const { motion } = theme;
  const duration = MotionSettings.getMotionDuration({
    frames: flight.duration,
    options: flight.motion,
    theme,
  });
  const progress = MotionSettings.getMotionProgress({
    frame,
    at: flight.at,
    duration: flight.duration,
    options: flight.motion,
    fallback: motion.curve(theme.easing.inOutCubic),
    theme,
  });
  return {
    x: progress * flight.dx,
    y: progress * flight.dy,
    opacity:
      1 -
      motion.ramp(
        frame,
        flight.at + duration * 0.55,
        duration * 0.45,
        motion.reveal.easing,
      ),
    active: frame < flight.at + duration,
  };
}
