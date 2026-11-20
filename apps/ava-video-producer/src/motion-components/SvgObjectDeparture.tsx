import { useId } from "react";
import { getObjectFlight } from "./getObjectFlight";
import type { ObjectFlight } from "./getObjectFlight";
import type { ReactNode } from "react";

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
}: {
  children: ReactNode;
  frame: number;
  flight: ObjectFlight;
  width?: number;
  height?: number;
}): ReactNode {
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
