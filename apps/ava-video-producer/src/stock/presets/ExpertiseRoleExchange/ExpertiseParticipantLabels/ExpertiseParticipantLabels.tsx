import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { Input } from "../ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = {
  person: Input["people"][number];
  labelX: number;
  input: Input;
};

/** Renders the labels with authored geometry. */
export function ExpertiseParticipantLabels({
  person,
  labelX,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [person.label, labelX, 95, 220, 20, 3],
        ...(input.showJobRoles
          ? [
              [person.roleLabel, labelX, 185, 220, 14, 3] as [
                string,
                number,
                number,
                number,
                14,
                number,
              ],
            ]
          : []),
      ]}
    />
  );
}
