import { STOCK } from "../../graphics-common";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  membership: "included" | "excluded" | "unknown";
  color?: string;
};
const MEMBERSHIP_PATHS: {
  included: string;
  excluded: string;
  unknown: string;
} = {
  included: "M-5 0 L-1 4 L6 -5",
  excluded: "M-4 -4 L4 4 M-4 4 L4 -4",
  unknown: "M-4 0 H4",
};

/**
 * Draws explicit membership state without determining eligibility or grants.
 */
export function MembershipMarker({
  x,
  y,
  membership,
  color = STOCK.mint,
}: Readonly<Props>): ReactNode {
  if (![x, y].every(Number.isFinite) || !(membership in MEMBERSHIP_PATHS)) {
    throw new Error(
      "Membership markers require finite placement and an explicit supported state.",
    );
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle
        r={11}
        fill={STOCK.surface}
        stroke={membership === "included" ? color : STOCK.muted}
      />
      <path
        d={MEMBERSHIP_PATHS[membership]}
        fill="none"
        stroke={membership === "included" ? color : STOCK.muted}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
