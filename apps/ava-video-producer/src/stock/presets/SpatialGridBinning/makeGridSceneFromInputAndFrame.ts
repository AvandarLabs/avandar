import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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

const COUNT_AT = 51;
const COUNT_FRAMES = 37;
type CellCount = {
  index: number;
  column: number;
  row: number;
  count: number;
  arrived: number;
};
function _getAssignments(input: Readonly<Input>): number[] {
  const { columns, rows } = input.grid;
  return input.points.map((point) => {
    return (
      Math.min(rows - 1, Math.floor((point.y / 100) * rows)) * columns +
      Math.min(columns - 1, Math.floor((point.x / 100) * columns))
    );
  });
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
  return Array.from({ length: columns * rows }, (_, index) => {
    return {
      index,
      column: index % columns,
      row: Math.floor(index / columns),
      count: assignments.filter((cell) => {
        return cell === index;
      }).length,
      arrived: points.filter((point) => {
        return point.cell === index && point.progress === 1;
      }).length,
    };
  });
}
type GridSceneArgs = Readonly<{
  input: Input;
  frame: number;
  motion: Pick<VideoMotion, "ramp" | "scale" | "travel" | "stagger">;
}>;

/**
 * Assign each observation once, then move its token to a distinct ledger slot.
 */
export function makeGridSceneFromInputAndFrame({
  input,
  frame,
  motion,
}: GridSceneArgs): {
  points: CountToken[];
  cells: CellCount[];
} {
  const assignments = _getAssignments(input);
  const points = _createCountTokens({ input, frame, motion }, assignments);
  const cells = _createCells({ input, assignments, points });
  return { points, cells };
}

/** Each observation's token, moving from its source into its cell's slot. */
function _createCountTokens(
  { input, frame, motion }: GridSceneArgs,
  assignments: readonly number[],
): CountToken[] {
  const { columns, rows } = input.grid;
  return input.points.map((point, index) => {
    const cell = assignments[index];
    const rank = assignments.slice(0, index).filter((assigned) => {
      return assigned === cell;
    }).length;
    const progress = motion.ramp(
      frame,
      COUNT_AT + index * motion.stagger.list,
      motion.scale(COUNT_FRAMES),
      motion.travel.easing,
    );
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
}
