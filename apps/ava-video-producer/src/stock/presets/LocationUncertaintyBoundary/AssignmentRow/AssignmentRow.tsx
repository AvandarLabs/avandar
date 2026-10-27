import { ramp, mix } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { FocusedRecord } from "./FocusedRecord";
import type { getAssignmentsFromLocations } from "../getAssignmentsFromLocations";
import type { ReactNode } from "react";

type Props = {
  location: ReturnType<typeof getAssignmentsFromLocations>[number];
  index: number;
  frame: number;
  accent: string;
  isFocused: boolean;
};
/**
 * The focused record row mirrors the map's ring without changing accounting.
 */
export function AssignmentRow({
  location,
  index,
  frame,
  accent,
  isFocused,
}: Readonly<Props>): ReactNode {
  return (
    <g data-assignment={location.id} data-district-index={location.district}>
      {isFocused ? (
        <FocusedRecord id={location.id} index={index} accent={accent} />
      ) : undefined}
      <LabelSlots
        labels={[
          [String(index + 1), 480, 332 + index * 31, 24, 12, 1],
          [location.label, 515, 332 + index * 31, 280, 12, 1],
          [
            location.district < 0 ? "?" : String(location.district + 1),
            815,
            332 + index * 31,
            24,
            12,
            1,
          ],
        ]}
      />
      <path
        data-accounting-bracket={location.id}
        d={`M${location.district < 0 ? mix(ramp(frame, 72, 36), 850, 880) : 850} ${318 + index * 31}h12v20h-12`}
        fill="none"
        stroke={accent}
      />
    </g>
  );
}
