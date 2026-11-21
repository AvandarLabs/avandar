import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PublishedSnapshotFrame } from "./PublishedSnapshotFrame";
import { SnapshotCell } from "./SnapshotCell/SnapshotCell";
import { SnapshotHeadings } from "./SnapshotHeadings";
import { SnapshotRowGuide } from "./SnapshotRowGuide";
import { usePublicationSnapshotSlicePresentation } from "./usePublicationSnapshotSlicePresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";
/** Complete source table, selected slice, revision and later live edit. */
export type Props = GraphicProps & { input: Input };
/**
 * Copies a bounded selection, then changes only the live table's authored cell.
 */
export function PublicationSnapshotSlice(props: Readonly<Props>): ReactNode {
  const presentation = usePublicationSnapshotSlicePresentation(props);

  return (
    <g opacity={presentation.motion.reveal(props.frame, 0)}>
      <LabelSlots
        labels={[
          [props.input.copy.context, 52, 40, 856, 18, 2],
          [props.input.copy.source, 52, 90, 400, 12, 3],
          [props.input.copy.result, 508, 90, 400, 12, 3],
        ]}
      />
      <PublishedSnapshotFrame {...presentation} />
      <SnapshotHeadings input={props.input} frame={props.frame} />
      {props.input.selection.rowIds.map((rowId, selectedRow) => {
        return (
          <SnapshotRowGuide
            key={rowId}
            input={props.input}
            frame={props.frame}
            accent={props.accent}
            selectedRow={selectedRow}
          />
        );
      })}
      {[false, true].flatMap((snapshot) => {
        return props.input.table.rows.flatMap((row, rowIndex) => {
          return props.input.table.columns.map((column, columnIndex) => {
            return (
              <SnapshotCell
                key={`${snapshot}:${rowIndex}:${columnIndex}`}
                input={props.input}
                frame={props.frame}
                accent={props.accent}
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
