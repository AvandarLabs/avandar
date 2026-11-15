import { ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { RecordedInterval } from "./RecordedInterval";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";

type Props = {
  record: Input["records"][number];
  index: number;
  frame: number;
  accent: string;
  input: Input;
};
/** Unknown times never acquire a ribbon or a positive overlap. */
export function PresenceRibbon({
  record,
  index,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const y = 215 + index * 45;
  const overlapStart = Math.max(
    record.start ?? 0,
    input.investigationWindow.start,
  );
  const overlapEnd = Math.min(record.end ?? 0, input.investigationWindow.end);
  const hasOverlap = record.start !== null && overlapStart < overlapEnd;
  const state =
    record.start === null ? "unknown" : hasOverlap ? "overlap" : "none";
  return (
    <g
      data-presence={record.id}
      data-state={state}
      opacity={ramp(frame, 12 + index * 2, 12)}
    >
      <PersonGlyph x={45} y={y} size={28} color={accent} />
      <SceneLabel text={record.label} x={70} y={y - 3} width={195} lines={3} />
      <RecordedInterval record={record} axisEnd={input.axis.end} y={y} />
      {hasOverlap ? (
        <rect
          data-overlap="true"
          data-overlap-person={record.id}
          x={280 + (630 * overlapStart) / input.axis.end}
          y={y - 10}
          width={(630 * (overlapEnd - overlapStart)) / input.axis.end}
          height={20}
          rx={4}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          opacity={ramp(frame, 96 + index * 2, 10)}
        />
      ) : undefined}
    </g>
  );
}
