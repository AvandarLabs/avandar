import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getSnapshotCellFromFrame } from "./getSnapshotCellFromFrame";
import { SnapshotCellText } from "./SnapshotCellText";
import type { Input } from "./PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  accent: string;
  rowIndex: number;
  columnIndex: number;
  snapshot: boolean;
};
/**
 * Selected cell copies carry pre-edit values into a distinct revision frame.
 */
export function SnapshotCell({
  input,
  frame,
  accent,
  rowIndex,
  columnIndex,
  snapshot,
}: Readonly<Props>): ReactNode {
  const scene = getSnapshotCellFromFrame({
    input,
    frame,
    rowIndex,
    columnIndex,
    snapshot,
  });
  if (!scene.isVisible) {
    return undefined;
  }
  const identity = `${scene.row.id}:${scene.column.id}`;
  return (
    <g opacity={snapshot ? scene.copyOpacity : 1}>
      <rect
        data-snapshot-cell={snapshot ? identity : undefined}
        data-live-cell={!snapshot ? identity : undefined}
        data-value={scene.value}
        data-row-id={scene.row.id}
        data-column-id={scene.column.id}
        x={scene.x}
        y={scene.y}
        width={scene.width}
        height={72}
        fill={STOCK.surface}
        stroke={scene.selected ? accent : STOCK.line}
        strokeWidth={
          scene.selected
            ? 1 + ramp(frame, 13 + rowIndex * 2 + columnIndex * 2, 22)
            : 1
        }
      />
      <SnapshotCellText scene={scene} frame={frame} />
    </g>
  );
}
