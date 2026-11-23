import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./PublicationSnapshotSlice.schema";

type Params = {
  input: Input;
  frame: number;
  rowIndex: number;
  columnIndex: number;
  snapshot: boolean;
  motion: VideoMotion;
};

/** Data for getSnapshotCellFromFrame. */
type GetSnapshotCellFromFrameResult = {
  row: {
    id: string;
    cells: string[];
  };
  column: {
    id: string;
    label: string;
  };
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

type DurationOptions = {
  input: Readonly<Params>["input"];
  frame: Readonly<Params>["frame"];
  snapshot: Readonly<Params>["snapshot"];
  motion: Readonly<Params>["motion"];
  row: Readonly<Params>["input"]["table"]["rows"][number];
  column: Readonly<Params>["input"]["table"]["columns"][number];
  selectedRow: number;
};

type DurationResult = {
  duration: number;
  departure: number;
  progress: number;
  isEditTarget: boolean;
  isEdited: boolean;
};

type GetSnapshotCellFromFrameYOptions = {
  rowIndex: Readonly<Params>["rowIndex"];
  snapshot: Readonly<Params>["snapshot"];
  selectedRow: number;
  progress: DurationResult["progress"];
};

/** Finds the source cell and its position within the authored selection. */
function _getCellSelection({
  input,
  rowIndex,
  columnIndex,
}: Readonly<Pick<Params, "input" | "rowIndex" | "columnIndex">>): {
  row: Input["table"]["rows"][number];
  column: Input["table"]["columns"][number];
  selectedRow: number;
  selectedColumn: number;
  selected: boolean;
  sourceWidth: number;
  destinationWidth: number;
} {
  const row = input.table.rows[rowIndex],
    column = input.table.columns[columnIndex];
  const selectedRow = input.selection.rowIds.indexOf(row.id),
    selectedColumn = input.selection.columnIds.indexOf(column.id),
    selected = selectedRow >= 0 && selectedColumn >= 0;
  const sourceWidth = 400 / input.table.columns.length,
    destinationWidth = 400 / input.selection.columnIds.length;
  return {
    row,
    column,
    selectedRow,
    selectedColumn,
    selected,
    sourceWidth,
    destinationWidth,
  };
}

/** Samples the snapshot cell from frame y for the current authored frame. */
function _getSnapshotCellFromFrameY({
  rowIndex,
  snapshot,
  selectedRow,
  progress,
}: Readonly<GetSnapshotCellFromFrameYOptions>): number {
  return snapshot
    ? Motion.mix({
        t: progress,
        from: 204,
        to: 240 + selectedRow * 72,
      })
    : 240 + rowIndex * 72;
}

/**
 * Samples the snapshot cell from frame duration state for the current authored
 * frame.
 */
function _getSnapshotCellFromFrameDurationState({
  input,
  frame,
  snapshot,
  motion,
  row,
  column,
  selectedRow,
}: Readonly<DurationOptions>): DurationResult {
  const duration = 36 / input.selection.rowIds.length,
    departure =
      56 + (input.selection.rowIds.length - 1 - selectedRow) * duration;
  const progress = snapshot
    ? motion.ramp(frame, departure, duration - 1, motion.travel.easing)
    : 0;
  const isEditTarget =
    !snapshot &&
    row.id === input.liveEdit.rowId &&
    column.id === input.liveEdit.columnId;
  const isEdited = isEditTarget && frame >= 117;
  return { duration, departure, progress, isEditTarget, isEdited };
}

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
  motion,
}: Readonly<Params>): GetSnapshotCellFromFrameResult {
  const selection = _getCellSelection({ input, rowIndex, columnIndex });
  const { duration, departure, progress, isEditTarget, isEdited } =
    _getSnapshotCellFromFrameDurationState({
      input,
      frame,
      snapshot,
      motion,
      row: selection.row,
      column: selection.column,
      selectedRow: selection.selectedRow,
    });
  return {
    row: selection.row,
    column: selection.column,
    selected: selection.selected,
    isEditTarget,
    isEdited,
    departure,
    copyOpacity: motion.ramp(frame, departure, motion.scale(1)),
    isActiveCopy:
      snapshot && frame >= departure && frame < departure + duration,
    value: isEdited ? input.liveEdit.value : selection.row.cells[columnIndex],
    x: snapshot
      ? 508 + selection.selectedColumn * selection.destinationWidth
      : 52 + columnIndex * selection.sourceWidth,
    y: _getSnapshotCellFromFrameY({
      rowIndex,
      snapshot,
      selectedRow: selection.selectedRow,
      progress,
    }),
    width: snapshot ? selection.destinationWidth : selection.sourceWidth,
    isVisible: snapshot
      ? selection.selected
      : selection.selected || input.showExcludedCells,
  };
}
