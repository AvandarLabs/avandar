import { useId } from "react";
import type {
  ObjectFlight} from "./getObjectFlight/getObjectFlight";
import {
  getObjectFlight,
} from "./getObjectFlight/getObjectFlight";
import { MotionSettings } from "./MotionSettings/MotionSettings";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  frame: number;
  flight: ObjectFlight;
  width?: number;
  height?: number;
};
/** Luminance mask fills: white keeps the scene, black cuts the object out. */
const MASK_KEEP = "white";
const MASK_CUT = "black";
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
  if (frame < flight.at) {
    return children;
  }
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
