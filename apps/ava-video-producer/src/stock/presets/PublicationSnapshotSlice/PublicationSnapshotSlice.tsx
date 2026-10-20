import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SnapshotCell } from "./SnapshotCell";
import { SnapshotHeadings } from "./SnapshotHeadings";
import { SnapshotRowGuide } from "./SnapshotRowGuide";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";
/** Complete source table, selected slice, revision and later live edit. */
export type Props = GraphicProps & { input: Input };
/**
 * Copies a bounded selection, then changes only the live table's authored cell.
 */
export function PublicationSnapshotSlice({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 0, 12)}>
      <LabelSlots
        labels={[
          [input.copy.context, 52, 40, 856, 18, 2],
          [input.copy.source, 52, 90, 400, 12, 3],
          [input.copy.result, 508, 90, 400, 12, 3],
        ]}
      />
      <rect
        x={500}
        y={142}
        width={416}
        height={402}
        rx={8}
        fill="none"
        stroke={accent}
        opacity={ramp(frame, 56, 39)}
      />
      <SnapshotHeadings input={input} frame={frame} />
      {input.selection.rowIds.map((rowId, selectedRow) => (
        <SnapshotRowGuide
          key={rowId}
          input={input}
          frame={frame}
          accent={accent}
          selectedRow={selectedRow}
        />
      ))}
      {[false, true].flatMap((snapshot) =>
        input.table.rows.flatMap((row, rowIndex) =>
          input.table.columns.map((column, columnIndex) => (
            <SnapshotCell
              key={`${snapshot}:${rowIndex}:${columnIndex}`}
              input={input}
              frame={frame}
              accent={accent}
              rowIndex={rowIndex}
              columnIndex={columnIndex}
              snapshot={snapshot}
            />
          )),
        ),
      )}
    </g>
  );
}
