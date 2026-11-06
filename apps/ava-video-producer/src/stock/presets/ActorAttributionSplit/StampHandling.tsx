import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  personIndex: number;
  eventId: string;
  showGuides: boolean;
  accent: string;
};
/** Actor contact is independent from optional explanatory action guides. */
export function StampHandling({
  x,
  y,
  personIndex,
  eventId,
  showGuides,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d={`M105 ${200 + personIndex * 160} L${x} ${y}`}
        stroke={accent}
        strokeWidth={3}
        fill="none"
      />
      <circle data-stamping-hand={eventId} cx={x} cy={y} r={5} fill={accent} />
      {showGuides ? (
        <path
          data-action-guide={eventId}
          d={`M115 ${200 + personIndex * 160} L${x} ${y + 10}`}
          fill="none"
          stroke={STOCK.muted}
          strokeDasharray="3 5"
        />
      ) : undefined}
    </g>
  );
}
