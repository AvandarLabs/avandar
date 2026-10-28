import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { frame: number; accepted: boolean; accent: string };
/** Acknowledgement becomes visible before responsibility begins crossing. */
export function CustodyAcceptance({
  frame,
  accepted,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={accepted ? ramp(frame, 72, 8) : 0} data-acknowledgement="seal">
      <circle
        cx={900}
        cy={230}
        r={22}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      <path
        d="M890 230 l7 8 15 -18"
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
    </g>
  );
}
