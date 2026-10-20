import { ramp } from "../../../motion";
import type { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { ReactNode } from "react";
type Props = {
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  frame: number;
  accent: string;
};
/** Coincident coordinates retain one visible connection to every source key. */
export function PlottedRowAssociation({
  row,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const y = 132 + row.index * 69;
  return (
    <path
      data-row-association={row.id}
      d={`M${row.targetX} ${row.targetY} L438 ${row.targetY} L438 ${y} L441 ${y}`}
      fill="none"
      stroke={accent}
      strokeOpacity={0.45}
      opacity={ramp(frame, 90 + row.index * 3, 6)}
    />
  );
}
