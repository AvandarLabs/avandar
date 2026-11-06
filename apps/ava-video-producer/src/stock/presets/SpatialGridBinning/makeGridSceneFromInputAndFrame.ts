import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./SpatialGridBinning.schema";
/** Data for CountToken. */
type CountTokenResult = {
  index: number;
  cell: number;
  progress: number;
  sourceX: number;
  sourceY: number;
};

type CountToken = Input["points"][number] & CountTokenResult;
type CellCount = {
  index: number;
  column: number;
  row: number;
  count: number;
  arrived: number;
};
function _getAssignments(input: Readonly<Input>): number[] {
  const { columns, rows } = input.grid;
  return input.points.map(
    (point) =>
      Math.min(rows - 1, Math.floor((point.y / 100) * rows)) * columns +
      Math.min(columns - 1, Math.floor((point.x / 100) * columns)),
  );
}
function _createCells({
  input,
  assignments,
  points,
}: Readonly<{
  input: Input;
  assignments: number[];
  points: CountToken[];
}>): CellCount[] {
  const { columns, rows } = input.grid;
  return Array.from({ length: columns * rows }, (_, index) => ({
    index,
    column: index % columns,
    row: Math.floor(index / columns),
    count: assignments.filter((cell) => cell === index).length,
    arrived: points.filter(
      (point) => point.cell === index && point.progress === 1,
    ).length,
  }));
}
/**
 * Assign each observation once, then move its token to a distinct ledger slot.
 */
export function makeGridSceneFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): {
  points: CountToken[];
  cells: CellCount[];
} {
  const { columns, rows } = input.grid;
  const assignments = _getAssignments(input);
  const points = input.points.map((point, index) => {
    const cell = assignments[index];
    const rank = assignments
      .slice(0, index)
      .filter((assigned) => assigned === cell).length;
    const progress = ramp(frame, 51 + index * 2, 37, EASE.inOut);
    return {
      ...point,
      index,
      cell,
      progress,
      sourceX: 48 + point.x * 3.3,
      sourceY: 164 + point.y * 3.3,
      x: mix(
        progress,
        48 + point.x * 3.3,
        450 + ((cell % columns) * 420) / columns + 20 + (rank % 4) * 26,
      ),
      y: mix(
        progress,
        164 + point.y * 3.3,
        164 +
          (Math.floor(cell / columns) * 300) / rows +
          52 +
          Math.floor(rank / 4) * 18,
      ),
    };
  });
  const cells = _createCells({ input, assignments, points });
  return { points, cells };
}
