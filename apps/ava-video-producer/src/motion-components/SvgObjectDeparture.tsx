import { useId } from "react";
import { EASE, ramp } from "../motion";
import { getMotionDuration, getMotionProgress } from "./motionSettings";
import type { MotionRect } from "./AnchoredOverlay";
import type { MotionOptions } from "./motionSettings";
import type { ReactNode } from "react";

/** Authored cutout and its departure vector, in the parent SVG's coordinates. */
export type ObjectFlight = {
  at: number;
  duration: number;
  dx: number;
  dy: number;
  rect: MotionRect;
  motion?: MotionOptions;
};

/** Deterministic departure geometry. Its active flag can drive DiagramCamera blurActive. */
export function getObjectFlight(flight: ObjectFlight, frame: number) {
  if (frame < flight.at) return { x: 0, y: 0, opacity: 1, active: false };
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

/** Isolate a vector object for independent travel. Never pass live product components. */
export function SvgObjectDeparture({
  children,
  frame,
  flight,
  width = 960,
  height = 600,
}: {
  children: ReactNode;
  frame: number;
  flight: ObjectFlight;
  width?: number;
  height?: number;
}) {
  const identity = `departure-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (frame < flight.at) return children;
  const pose = getObjectFlight(flight, frame);
  return (
    <>
      <defs>
        <mask id={`${identity}-rest`}>
          <rect width={width} height={height} fill="white" />
          <rect {...flight.rect} fill="black" />
        </mask>
        <clipPath id={`${identity}-object`}>
          <rect {...flight.rect} />
        </clipPath>
      </defs>
      <g mask={`url(#${identity}-rest)`}>{children}</g>
      <g transform={`translate(${pose.x} ${pose.y})`} opacity={pose.opacity}>
        <g clipPath={`url(#${identity}-object)`}>{children}</g>
      </g>
    </>
  );
}
