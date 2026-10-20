import { propEq, prop } from "@avandar/utils";
import type { Input } from "./EnvironmentalObservationGaps.schema";
/** Data for makeObservationLayoutFromInput. */
type CreateObservationLayoutCells = {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  label: string;
  column: number;
  row: number;
  value: number | null;
};

/** Data for makeObservationLayoutFromInput. */
type CreateObservationLayoutChecks = {
  x: number;
  y: number;
  key: number;
  id: string;
  label: string;
  cellId: string;
  value: number;
};

/**
 * Schematic cell extents and separate point supports, relative to supplied
 * bounds.
 */
export function makeObservationLayoutFromInput(input: Readonly<Input>): {
  cells: CreateObservationLayoutCells[];
  checks: CreateObservationLayoutChecks[];
} {
  const rows = input.cells.map(prop("row")),
    columns = input.cells.map(prop("column"));
  const firstRow = Math.min(...rows),
    firstColumn = Math.min(...columns);
  const numRows = Math.max(...rows) - firstRow + 1,
    numColumns = Math.max(...columns) - firstColumn + 1;
  const width = 650 / numColumns,
    height = 300 / numRows;
  const cells = input.cells.map((cell) => ({
    ...cell,
    x: 270 + (cell.column - firstColumn) * width,
    y: 105 + (cell.row - firstRow) * height,
    width,
    height,
  }));
  const checks = input.fieldChecks.map((check, index) => {
    const cell = cells.find(propEq("id", check.cellId))!;
    const localIndex = input.fieldChecks
      .slice(0, index)
      .filter(propEq("cellId", check.cellId)).length;
    const numChecks = input.fieldChecks.filter(
      propEq("cellId", check.cellId),
    ).length;
    return {
      ...check,
      x: cell.x + 55 + (numChecks - 1 - localIndex) * 36,
      y: cell.y + cell.height - 10,
      key: index + 1,
    };
  });
  return {
    cells,
    checks: [...checks].sort(
      (first, second) => first.y - second.y || second.x - first.x,
    ),
  };
}
