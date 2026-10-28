import { STOCK } from "../../stockPalette";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  location: Input["locations"][number];
  accent: string;
};
/** Source geometry remains fixed regardless of the chosen radius. */
export function BufferSourceMarker({
  input,
  location,
  accent,
}: Readonly<Props>): ReactNode {
  const center = { cx: 48 + location.x * 3.6, cy: 190 + location.y * 3.6 };
  const distance = Math.hypot(
    location.x - input.origin.x,
    location.y - input.origin.y,
  );
  return (
    <g>
      {input.showDistances ? (
        <line
          x1={48 + input.origin.x * 3.6}
          y1={190 + input.origin.y * 3.6}
          x2={center.cx}
          y2={center.cy}
          stroke={STOCK.line}
          strokeDasharray="3 4"
        />
      ) : undefined}
      <circle
        data-location-position={`${location.x},${location.y}`}
        {...center}
        r={5}
        fill={distance <= input.radiusUnits ? accent : STOCK.orange}
        stroke={STOCK.ground}
      />
    </g>
  );
}
