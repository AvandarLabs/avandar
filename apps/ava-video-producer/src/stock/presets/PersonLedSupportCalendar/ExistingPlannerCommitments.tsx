import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AppointmentGeometry } from "./AppointmentGeometry";
import { PlannerBooking } from "./PlannerBooking";
import { PlannerBookingLabel } from "./PlannerBookingLabel";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";
/** Inputs for ExistingPlannerCommitments. */
type Props = { input: Input; labelsOnly?: boolean };
/** Fixed commitment labels paint above all moving proposal strokes. */
export function ExistingPlannerCommitments({
  input,
  labelsOnly = false,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {input.commitments
        .filter(propEq("kind", "existing"))
        .map((commitment) => {
          const cell = AppointmentGeometry.getCellFromCommitment({
            input,
            commitment,
            agreed: false,
          });
          return labelsOnly ? (
            <PlannerBookingLabel
              key={commitment.id}
              label={commitment.label}
              bookingId={commitment.id}
              {...cell}
              accent={tokens.color.accentAlt}
            />
          ) : (
            <PlannerBooking
              key={commitment.id}
              commitment={commitment}
              {...cell}
              accent={tokens.color.accentAlt}
              showLabel={false}
            />
          );
        })}
    </g>
  );
}
