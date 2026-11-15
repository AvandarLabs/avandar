import { OrthogonalGrid } from "../../geometry/OrthogonalGrid/OrthogonalGrid";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
/** Preserve the gross perimeter and real holes in the scene's floor grid. */
export function buildFloorOutlineFromTiles(
  tiles: Readonly<Input["floorTiles"]>,
): string {
  return OrthogonalGrid.getOutlineFromCells({
    cells: tiles,
    origin: { x: 60, y: 145 },
    cellWidth: 82,
    cellHeight: 62,
  });
}
