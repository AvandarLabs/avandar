import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  zoneId: string;
  points: string;
  first: [number, number];
  index: number;
  frame: number;
  accent: string;
};
/**
 * The unchanged footprint connects to a clear denominator shelf outside the
 * map.
 */
export function ZoneGround({
  zoneId,
  points,
  first,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <polygon
        points={points}
        fill={STOCK.surface}
        stroke={STOCK.muted}
        strokeDasharray="4 4"
      />
      <path
        data-denominator-connector={zoneId}
        d={`M${55 + first[0] * 5} ${180 + first[1] * 2.5} L590 ${178 + index * 80} L627 ${178 + index * 80}`}
        fill="none"
        stroke={accent}
        strokeOpacity={0.4 * ramp(frame, 36, 36)}
      />
    </g>
  );
}
