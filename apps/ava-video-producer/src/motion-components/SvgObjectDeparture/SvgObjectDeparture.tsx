import { useId } from "react";
import { MotionSettings } from "../MotionSettings/MotionSettings";
import type { MotionRect } from "../AnchoredOverlay/AnchoredOverlay";
import type {
  MotionOptions,
  MotionSettingsTheme,
} from "../MotionSettings/MotionSettings";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  frame: number;
  flight: ObjectFlight;
  width?: number;
  height?: number;
};
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
/** Luminance mask fills: white keeps the scene, black cuts the object out. */
const MASK_KEEP = "white";
const MASK_CUT = "black";
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
  if (frame < flight.at) return { x: 0, y: 0, opacity: 1, active: false };
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
/**
 * Isolate a vector object for independent travel. Never pass live product
 * components.
 */
export function SvgObjectDeparture({
  children,
  frame,
  flight,
  width = 960,
  height = 600,
}: Readonly<Props>): ReactNode {
  const identity = `departure-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const theme = MotionSettings.useMotionSettingsTheme();
  if (frame < flight.at) return children;
  const pose = getObjectFlight({ flight, frame, theme });
  return (
    <>
      <defs>
        <mask id={`${identity}-rest`}>
          <rect width={width} height={height} fill={MASK_KEEP} />
          <rect {...flight.rect} fill={MASK_CUT} />
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
