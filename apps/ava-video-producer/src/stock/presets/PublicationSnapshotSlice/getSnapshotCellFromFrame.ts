import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./PublicationSnapshotSlice.schema";

type Params = {
  input: Input;
  frame: number;
  rowIndex: number;
  columnIndex: number;
  snapshot: boolean;
};
/** Data for getSnapshotCellFromFrame. */
type GetSnapshotCellFromFrameResult = {
  row: { id: string; cells: string[] };
  column: { id: string; label: string };
  selected: boolean;
  isEditTarget: boolean;
  isEdited: boolean;
  departure: number;
  copyOpacity: number;
  isActiveCopy: boolean;
  value: string;
  x: number;
  y: number;
  width: number;
  isVisible: boolean;
};

/**
 * A selected row copy descends into its explicit ordered slot before the next
 * row.
 */
export function getSnapshotCellFromFrame({
  input,
  frame,
  rowIndex,
  columnIndex,
  snapshot,
}: Readonly<Params>): GetSnapshotCellFromFrameResult {
  const row = input.table.rows[rowIndex],
    column = input.table.columns[columnIndex];
  const selectedRow = input.selection.rowIds.indexOf(row.id),
    selectedColumn = input.selection.columnIds.indexOf(column.id),
    selected = selectedRow >= 0 && selectedColumn >= 0;
  const sourceWidth = 400 / input.table.columns.length,
    destinationWidth = 400 / input.selection.columnIds.length;
  const duration = 36 / input.selection.rowIds.length,
    departure =
      56 + (input.selection.rowIds.length - 1 - selectedRow) * duration;
  const progress = snapshot
    ? ramp(frame, departure, duration - 1, EASE.inOut)
    : 0;
  const isEditTarget =
    !snapshot &&
    row.id === input.liveEdit.rowId &&
    column.id === input.liveEdit.columnId;
  const isEdited = isEditTarget && frame >= 117;
  return {
    row,
    column,
    selected,
    isEditTarget,
    isEdited,
    departure,
    copyOpacity: ramp(frame, departure, 1),
    isActiveCopy:
      snapshot && frame >= departure && frame < departure + duration,
    value: isEdited ? input.liveEdit.value : row.cells[columnIndex],
    x: snapshot
      ? 508 + selectedColumn * destinationWidth
      : 52 + columnIndex * sourceWidth,
    y: snapshot
      ? mix(progress, 204, 240 + selectedRow * 72)
      : 240 + rowIndex * 72,
    width: snapshot ? destinationWidth : sourceWidth,
    isVisible: snapshot ? selected : selected || input.showExcludedCells,
  };
}
