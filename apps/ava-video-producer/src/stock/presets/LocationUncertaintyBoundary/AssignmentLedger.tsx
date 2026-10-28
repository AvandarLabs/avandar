import { propEq } from "@avandar/utils";
import { AssignmentRows } from "./AssignmentRows";
import { DistrictLabels } from "./DistrictLabels";
import { getAssignmentsFromLocations } from "./getAssignmentsFromLocations";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Full-record accounting is independent of footprint visibility. */
export function AssignmentLedger({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const assignments = getAssignmentsFromLocations(input);
  const focus = assignments.find(propEq("id", input.focusedLocationId))!;
  return (
    <g>
      <DistrictLabels input={input} frame={frame} focus={focus} />
      <AssignmentRows
        assignments={assignments}
        focusedLocationId={input.focusedLocationId}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
