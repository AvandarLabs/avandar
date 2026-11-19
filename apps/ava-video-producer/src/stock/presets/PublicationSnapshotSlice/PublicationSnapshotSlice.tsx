import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SnapshotCell } from "./SnapshotCell";
import { SnapshotHeadings } from "./SnapshotHeadings";
import { SnapshotRowGuide } from "./SnapshotRowGuide";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g opacity={motion.reveal(frame, 0)}>
      <LabelSlots
        labels={[
          [input.copy.context, 52, 40, 856, 18, 2],
          [input.copy.source, 52, 90, 400, 12, 3],
          [input.copy.result, 508, 90, 400, 12, 3],
        ]}
      />
      <StockRect
        x={500}
        y={142}
        width={416}
        height={402}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={accent}
        opacity={motion.ramp(frame, 56, motion.scale(39))}
      />
      <SnapshotHeadings input={input} frame={frame} />
      {input.selection.rowIds.map((rowId, selectedRow) => {
        return (
          <SnapshotRowGuide
            key={rowId}
            input={input}
            frame={frame}
            accent={accent}
            selectedRow={selectedRow}
          />
        );
      })}
      {[false, true].flatMap((snapshot) => {
        return input.table.rows.flatMap((row, rowIndex) => {
          return input.table.columns.map((column, columnIndex) => {
            return (
              <SnapshotCell
                key={`${snapshot}:${rowIndex}:${columnIndex}`}
                input={input}
                frame={frame}
                accent={accent}
                rowIndex={rowIndex}
                columnIndex={columnIndex}
                snapshot={snapshot}
              />
            );
          });
        });
      })}
    </g>
  );
}
