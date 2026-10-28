import { ramp, mix, EASE } from "../../../motion";
import type { Input } from "./PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  accent: string;
  selectedRow: number;
};
/** The active selected source row stays keyed to its traveling frozen copy. */
export function SnapshotRowGuide({
  input,
  frame,
  accent,
  selectedRow,
}: Readonly<Props>): ReactNode {
  const duration = 36 / input.selection.rowIds.length,
    departure =
      56 + (input.selection.rowIds.length - 1 - selectedRow) * duration;
  const sourceRow = input.table.rows.findIndex(
    ({ id }) => id === input.selection.rowIds[selectedRow],
  );
  const sourceY = 276 + sourceRow * 72,
    copyY = mix(
      ramp(frame, departure, duration - 1, EASE.inOut),
      240,
      276 + selectedRow * 72,
    );
  const opacity =
    ramp(frame, departure, 1) * (1 - ramp(frame, departure + duration - 1, 1));
  return (
    <path
      data-copy-source-row={input.selection.rowIds[selectedRow]}
      d={`M452 ${sourceY} H480 V${copyY} H508`}
      fill="none"
      stroke={accent}
      strokeWidth={2}
      opacity={opacity}
    />
  );
}
