import { STOCK } from "../../stockPalette";
import { PlannerBookingLabel } from "./PlannerBookingLabel";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";

type Props = {
  commitment: Input["commitments"][number];
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
  showLabel?: boolean;
  isProposal?: boolean;
};
/**
 * One actual appointment has an outlined proposal or a filled agreed surface.
 */
export function PlannerBooking({
  commitment,
  x,
  y,
  width,
  height,
  accent,
  showLabel = true,
  isProposal = false,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-booking={commitment.id}
        data-kind={commitment.kind}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={isProposal ? "none" : STOCK.elevated}
        stroke={accent}
        strokeWidth={2}
        strokeDasharray={isProposal ? "6 3" : undefined}
      />
      {showLabel ? (
        <PlannerBookingLabel
          label={commitment.label}
          bookingId={commitment.id}
          {...{ x, y, width, height, accent, isProposal }}
        />
      ) : undefined}
    </g>
  );
}
