import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { ReactNode } from "react";

type Props = {
  label: string;
  bookingId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
  isProposal?: boolean;
};
/**
 * A connected caption keeps a travelling proposal clear of fixed commitments.
 */
export function PlannerBookingLabel({
  label,
  bookingId,
  x,
  y,
  width,
  height,
  accent,
  isProposal = false,
}: Readonly<Props>): ReactNode {
  return (
    <g data-booking-label={bookingId}>
      {isProposal ? (
        <path
          data-proposal-label-connector=""
          d={`M${x + width / 2} ${y + height} L224 450 V462 H236`}
          fill="none"
          stroke={accent}
          strokeWidth={1.5}
        />
      ) : undefined}
      <LabelSlots
        labels={[
          [
            label,
            isProposal ? 240 : x + 4,
            isProposal ? 465 : y + 20,
            isProposal ? 540 : width - 8,
            12,
            isProposal ? 1 : 4,
          ],
        ]}
      />
    </g>
  );
}
