import { ramp } from "../../../motion";
import { LocationPin } from "./LocationPin";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";
type Props = {
  location: Input["locations"][number];
  index: number;
  showFootprint: boolean;
  isFocused: boolean;
  frame: number;
  accent: string;
};
/**
 * Coincident pins retain separate keyed callouts without moving their disks.
 */
export function UncertainLocation({
  location,
  index,
  showFootprint,
  isFocused,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const x = 50 + location.x * 3.6,
    y = 140 + location.y * 3.6;
  return (
    <g>
      {showFootprint ? (
        <circle
          data-footprint={location.id}
          cx={x}
          cy={y}
          r={location.radius * 3.6 * ramp(frame, 36, 48)}
          fill={accent}
          fillOpacity={0.12}
          stroke={accent}
          strokeWidth={1.5}
        />
      ) : undefined}
      <LocationPin
        location={location}
        index={index}
        x={x}
        y={y}
        isFocused={isFocused}
        accent={accent}
      />
    </g>
  );
}
