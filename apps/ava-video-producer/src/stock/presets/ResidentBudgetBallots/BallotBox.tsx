import { EASE, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { frame: number };
/** The hinged lid opens after casting and stays open throughout extraction. */
export function BallotBox({ frame }: Readonly<Props>): ReactNode {
  const lift = 48 * ramp(frame, 76, 8, EASE.inOut);
  return (
    <g data-ballot-box="shared" opacity={1 - ramp(frame, 108, 4)}>
      <rect
        x={420}
        y={250}
        width={120}
        height={64}
        rx={6}
        fill={STOCK.surface}
        stroke={STOCK.muted}
      />
      <path d="M424 252 h112 v12 H424 Z" fill={STOCK.ground} />
      <polygon
        points={`420,250 540,${250 - lift} 540,${264 - lift} 420,264`}
        fill={STOCK.surface}
        stroke={STOCK.muted}
      />
      <path
        d={`M440 ${257 - lift / 6} L520 ${257 - (lift * 5) / 6}`}
        stroke={STOCK.muted}
        strokeWidth={4}
      />
    </g>
  );
}
