import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const appointment = AppointmentGeometry.fromInput({ input, frame, motion });
  return (
    <g>
      <ExistingPlannerCommitments input={input} />
      {input.showOriginalAppointment && frame >= 52 ? (
        <rect
          data-proposal-ghost={appointment.commitment.id}
          {...appointment.initial}
          fill="none"
          stroke={tokens.color.highlight}
          strokeDasharray={tokens.dash.pending.join(" ")}
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
