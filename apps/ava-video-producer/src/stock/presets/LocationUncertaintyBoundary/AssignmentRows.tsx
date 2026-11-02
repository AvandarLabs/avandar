import { AssignmentRow } from "./AssignmentRow/AssignmentRow";
import type { getAssignmentsFromLocations } from "./getAssignmentsFromLocations";
import type { ReactNode } from "react";

type Props = {
  assignments: ReturnType<typeof getAssignmentsFromLocations>;
  focusedLocationId: string;
  frame: number;
  accent: string;
};
/** Each record owns exactly one definite or unresolved accounting marker. */
export function AssignmentRows({
  assignments,
  focusedLocationId,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {assignments.map((location, index) => (
        <AssignmentRow
          key={location.id}
          location={location}
          index={index}
          frame={frame}
          accent={accent}
          isFocused={location.id === focusedLocationId}
        />
      ))}
    </g>
  );
}
