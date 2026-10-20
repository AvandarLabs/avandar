import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";
type Props = {
  location: Input["locations"][number];
  index: number;
  x: number;
  y: number;
  isFocused: boolean;
  accent: string;
};
/**
 * A persistent ring and stronger keyed connector identify the explained record.
 */
export function LocationPin({
  location,
  index,
  x,
  y,
  isFocused,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <circle
        data-nominal-pin={location.id}
        cx={x}
        cy={y}
        r={isFocused ? 5 : 3}
        fill={isFocused ? accent : STOCK.text}
        stroke={isFocused ? STOCK.text : "none"}
        strokeWidth={isFocused ? 2 : 0}
      />
      <path
        data-location-connector={location.id}
        d={`M${x} ${y} L420 ${328 + index * 31} H440`}
        fill="none"
        stroke={isFocused ? accent : STOCK.muted}
        strokeWidth={isFocused ? 2 : 0.8}
      />
      <LabelSlots
        labels={[[String(index + 1), 444, 332 + index * 31, 24, 12, 1]]}
      />
    </g>
  );
}
