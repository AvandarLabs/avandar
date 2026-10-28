import { STOCK } from "../../stockPalette";
import { AppointmentGeometry } from "./AppointmentGeometry";
import { ExistingPlannerCommitments } from "./ExistingPlannerCommitments";
import { PlannerBooking } from "./PlannerBooking";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Existing commitments stay readable beneath the single outlined proposal. */
export function PlannerAppointments({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const appointment = AppointmentGeometry.fromInput({ input, frame });
  return (
    <g>
      <ExistingPlannerCommitments input={input} />
      {input.showOriginalAppointment && frame >= 52 ? (
        <rect
          data-proposal-ghost={appointment.commitment.id}
          {...appointment.initial}
          fill="none"
          stroke={STOCK.orange}
          strokeDasharray="4 4"
        />
      ) : undefined}
      <PlannerBooking
        commitment={appointment.commitment}
        x={appointment.x}
        y={appointment.y}
        width={appointment.width}
        height={appointment.height}
        accent={accent}
        isProposal={frame < 100}
      />
    </g>
  );
}
