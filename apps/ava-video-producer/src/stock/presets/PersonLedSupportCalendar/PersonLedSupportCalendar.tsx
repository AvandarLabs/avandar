import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ExistingPlannerCommitments } from "./ExistingPlannerCommitments";
import { PlannerAppointments } from "./PlannerAppointments";
import { PlannerGrid } from "./PlannerGrid";
import { PlannerPeople } from "./PlannerPeople";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";
/** Explicit authored scene props. */
export type Props = GraphicProps & { input: Input };
/**
 * PersonLedSupportCalendar renders the supplied quantities and explicit
 * timeline.
 */
export function PersonLedSupportCalendar({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.people.participant, 60, 40, 340, 14, 3],
          [input.people.worker, 560, 40, 340, 14, 3],
          [input.copy.goal, 60, 490, 560, 16, 3],
          [input.copy.example, 60, 560, 840, 14, 2],
        ]}
      />
      <PlannerGrid input={input} />
      <PlannerAppointments input={input} frame={frame} accent={accent} />
      <PlannerPeople input={input} frame={frame} accent={accent} />
      <ExistingPlannerCommitments input={input} labelsOnly />
      <g opacity={ramp(frame, 120, 12)}>
        <LabelSlots labels={[[input.copy.agreement, 680, 490, 220, 14, 4]]} />
      </g>
    </g>
  );
}
