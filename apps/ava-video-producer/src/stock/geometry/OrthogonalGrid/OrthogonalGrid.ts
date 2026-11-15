/** A caller-validated unique cell with safe integer grid coordinates. */
export type OrthogonalGridCell = { column: number; row: number };
type OutlineOptions = {
  cells: readonly OrthogonalGridCell[];
  origin: Readonly<{ x: number; y: number }>;
  cellWidth: number;
  cellHeight: number;
};
const NEIGHBORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
function _buildCellKey({ column, row }: OrthogonalGridCell): string {
  return `${column},${row}`;
}
/** Check shared-side connectivity. Empty input is not a connected footprint. */
function _areOrthogonalCellsConnected(
  cells: readonly OrthogonalGridCell[],
): boolean {
  if (!cells.length) {
    return false;
  }
  const remaining = new Set(cells.map(_buildCellKey));
  const pending = [cells[0]];
  while (pending.length) {
    const cell = pending.pop()!;
    if (remaining.delete(_buildCellKey(cell))) {
      NEIGHBORS.forEach(([columnOffset, rowOffset]) => {
        const neighbor = {
          column: cell.column + columnOffset,
          row: cell.row + rowOffset,
        };
        if (remaining.has(_buildCellKey(neighbor))) {
          pending.push(neighbor);
        }
      });
    }
  }
  return remaining.size === 0;
}
function _buildExposedCellEdges({
  cell,
  occupied,
  options,
}: {
  cell: OrthogonalGridCell;
  occupied: ReadonlySet<string>;
  options: OutlineOptions;
}): string[] {
  const { cellWidth, cellHeight, origin } = options;
  const x = origin.x + cell.column * cellWidth;
  const y = origin.y + cell.row * cellHeight;
  const paths = [
    `M${x} ${y}h${cellWidth}`,
    `M${x + cellWidth} ${y}v${cellHeight}`,
    `M${x} ${y + cellHeight}h${cellWidth}`,
    `M${x} ${y}v${cellHeight}`,
  ];
  return paths.filter(
    (_, index) =>
      !occupied.has(
        _buildCellKey({
          column: cell.column + NEIGHBORS[index][0],
          row: cell.row + NEIGHBORS[index][1],
        }),
      ),
  );
}
/**
 * Build exposed SVG edges, including holes, without filling absent cells.
 * Callers validate unique safe-integer cells, finite origin and positive finite
 * dimensions. Segments retain input-cell and top/right/bottom/left order.
 */
function _getOrthogonalGridOutlineFromCells(
  options: Readonly<OutlineOptions>,
): string {
  const occupied = new Set(options.cells.map(_buildCellKey));
  return options.cells
    .flatMap((cell) => _buildExposedCellEdges({ cell, occupied, options }))
    .join(" ");
}

/** Related orthogonal grid operations. */
export const OrthogonalGrid = {
  /**
   * Check shared-side connectivity. Empty input is not a connected footprint.
   */
  areCellsConnected: _areOrthogonalCellsConnected,
  /**
   * Build exposed SVG edges, including holes, without filling absent cells.
   * Callers validate unique safe-integer cells, finite origin and positive
   * finite
   * dimensions. Segments retain input-cell and top/right/bottom/left order.
   */
  getOutlineFromCells: _getOrthogonalGridOutlineFromCells,
} satisfies {
  areCellsConnected: typeof _areOrthogonalCellsConnected;
  getOutlineFromCells: typeof _getOrthogonalGridOutlineFromCells;
};
