import { EASE, ramp } from "../motion";
import { getMotionDuration, getMotionProgress } from "./motionSettings";
import type { MotionRect } from "./getOverlayTimings";
import type { MotionOptions } from "./motionSettings";

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
 * Deterministic departure geometry. Its active flag can drive DiagramCamera
 * blurActive.
 */
export function getObjectFlight(
  flight: ObjectFlight,
  frame: number,
): ObjectFlightPose {
  if (frame < flight.at) {
    return { x: 0, y: 0, opacity: 1, active: false };
  }
  const duration = getMotionDuration(flight.duration, flight.motion);
  const progress = getMotionProgress(
    frame,
    flight.at,
    flight.duration,
    flight.motion,
    EASE.inOutCubic,
  );
  return {
    x: progress * flight.dx,
    y: progress * flight.dy,
    opacity: 1 - ramp(frame, flight.at + duration * 0.55, duration * 0.45),
    active: frame < flight.at + duration,
  };
}
