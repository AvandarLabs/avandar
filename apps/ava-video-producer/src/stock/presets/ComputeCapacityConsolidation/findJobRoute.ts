/** Top-left coordinates of a whole work block. */
export type JobPoint = { x: number; y: number };
/** Fixed-width work geometry used as a collision obstacle. */
export type JobRectangle = JobPoint & { height: number; width: number };
type Options = {
  from: JobPoint;
  to: JobPoint;
  height: number;
  obstacles: JobRectangle[];
};
type Grid = { columns: number[]; rows: number[] };
function _isClear({ from, to, height, obstacles }: Readonly<Options>): boolean {
  const left = Math.min(from.x, to.x),
    top = Math.min(from.y, to.y);
  const right = Math.max(from.x, to.x) + 80,
    bottom = Math.max(from.y, to.y) + height;
  return obstacles.every(
    (rectangle) =>
      Math.min(right, rectangle.x + rectangle.width) -
        Math.max(left, rectangle.x) <=
        1e-9 ||
      Math.min(bottom, rectangle.y + rectangle.height) -
        Math.max(top, rectangle.y) <=
        1e-9,
  );
}
function _createGrid({ from, to, height, obstacles }: Readonly<Options>): Grid {
  const columns = [
    55,
    825,
    from.x,
    to.x,
    ...obstacles.flatMap((rectangle) => [
      rectangle.x - 80,
      rectangle.x + rectangle.width,
    ]),
  ];
  const rows = [
    100,
    370 - height,
    from.y,
    to.y,
    ...obstacles.flatMap((rectangle) => [
      rectangle.y - height,
      rectangle.y + rectangle.height,
    ]),
  ];
  return {
    columns: [...new Set(columns)]
      .filter((x) => x >= 55 && x <= 825)
      .sort((a, b) => a - b),
    rows: [...new Set(rows)]
      .filter((y) => y >= 100 && y <= 370 - height)
      .sort((a, b) => a - b),
  };
}
function _getIndex({
  grid,
  point,
}: {
  grid: Grid;
  point: JobPoint;
}): number | undefined {
  const column = grid.columns.indexOf(point.x);
  const row = grid.rows.indexOf(point.y);
  return column < 0 || row < 0 ? undefined : column * grid.rows.length + row;
}
function _getPoint({ grid, index }: { grid: Grid; index: number }): JobPoint {
  return {
    x: grid.columns[Math.floor(index / grid.rows.length)],
    y: grid.rows[index % grid.rows.length],
  };
}
function _getNeighbors({
  grid,
  index,
}: {
  grid: Grid;
  index: number;
}): number[] {
  const column = Math.floor(index / grid.rows.length),
    row = index % grid.rows.length;
  return [
    [column, row + 1],
    [column + 1, row],
    [column - 1, row],
    [column, row - 1],
  ]
    .filter(
      ([x, y]) =>
        x >= 0 && x < grid.columns.length && y >= 0 && y < grid.rows.length,
    )
    .map(([x, y]) => x * grid.rows.length + y);
}
function _createPoints({
  grid,
  parents,
  end,
}: {
  grid: Grid;
  parents: Map<number, number>;
  end: number;
}): JobPoint[] {
  const reversed: JobPoint[] = [];
  let current = end;
  while (current !== -1) {
    reversed.push(_getPoint({ grid, index: current }));
    current = parents.get(current)!;
  }
  const points = reversed.reverse();
  return points.filter(
    (point, index) =>
      index === 0 ||
      index === points.length - 1 ||
      !(
        (points[index - 1].x === point.x && point.x === points[index + 1].x) ||
        (points[index - 1].y === point.y && point.y === points[index + 1].y)
      ),
  );
}
/**
 * Finds an axis-aligned route whose entire swept rectangle clears every job.
 */
export function findJobRoute(
  options: Readonly<Options>,
): JobPoint[] | undefined {
  const grid = _createGrid(options);
  const start = _getIndex({ grid, point: options.from });
  const end = _getIndex({ grid, point: options.to });
  if (start === undefined || end === undefined) {
    return undefined;
  }
  const pending = [start],
    parents = new Map<number, number>([[start, -1]]);
  // A bounded breadth-first work queue visits each configuration-space vertex
  // once.
  for (let cursor = 0; cursor < pending.length; cursor++) {
    const current = pending[cursor];
    if (current === end) {
      return _createPoints({ grid, parents, end });
    }
    _getNeighbors({ grid, index: current }).forEach((neighbor) => {
      if (
        !parents.has(neighbor) &&
        _isClear({
          ...options,
          from: _getPoint({ grid, index: current }),
          to: _getPoint({ grid, index: neighbor }),
        })
      ) {
        parents.set(neighbor, current);
        pending.push(neighbor);
      }
    });
  }
  return undefined;
}
