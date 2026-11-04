import {
  type OrthogonalGridCell,
  OrthogonalGrid,
} from "../../geometry/OrthogonalGrid/OrthogonalGrid";
/** Draw supplied zone edges in the scene's fixed atomic grid. */
export function buildZoneOutlineFromCells(
  cells: readonly OrthogonalGridCell[],
): string {
  return OrthogonalGrid.getOutlineFromCells({
    cells,
    origin: { x: 60, y: 150 },
    cellWidth: 120,
    cellHeight: 110,
  });
}
