import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { AssignmentLedger } from "./AssignmentLedger";
import { getAssignmentsFromLocations } from "./getAssignmentsFromLocations";
import { UncertaintyMap } from "./UncertaintyMap";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";
/** Explicit authored scene props. */
export type Props = GraphicProps & { input: Input };
/**
 * LocationUncertaintyBoundary renders the supplied quantities and explicit
 * timeline.
 */
export function LocationUncertaintyBoundary({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const assignments = getAssignmentsFromLocations(input);
  const definite = assignments.filter(
    (location) => location.district >= 0,
  ).length;
  return (
    <g
      data-definite={definite}
      data-unresolved={input.locations.length - definite}
    >
      <LabelSlots
        labels={[
          [input.copy.context, 50, 30, 850, 16, 2],
          [input.copy.nominal, 50, 95, 360, 14, 3],
          [input.copy.possible, 480, 67, 420, 14, 3],
          [input.copy.definite, 50, 535, 270, 12, 3],
          [String(definite), 50, 586, 270, 16, 1],
          [input.copy.unresolved, 350, 535, 270, 12, 3],
          [String(input.locations.length - definite), 350, 586, 270, 16, 1],
          [input.copy.total, 650, 520, 250, 12, 4],
          [`${input.locations.length}`, 650, 586, 48, 16, 1],
          [input.copy.unit, 480, 282, 420, 12, 3],
        ]}
      />
      <UncertaintyMap input={input} frame={frame} accent={accent} />
      <AssignmentLedger input={input} frame={frame} accent={accent} />
    </g>
  );
}
