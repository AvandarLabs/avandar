function _roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
}

function _roundCubeCoordinates(q: number, r: number): { q: number; r: number } {
  const cubeY = -q - r;
  const initialQ = _roundHalfAwayFromZero(q);
  const roundedY = _roundHalfAwayFromZero(cubeY);
  const initialR = _roundHalfAwayFromZero(r);
  const qDifference = Math.abs(initialQ - q);
  const yDifference = Math.abs(roundedY - cubeY);
  const rDifference = Math.abs(initialR - r);
  const qIsLargest = qDifference > yDifference && qDifference > rDifference;
  const roundedQ = qIsLargest ? -roundedY - initialR : initialQ;
  const roundedR = qIsLargest
    ? initialR
    : yDifference <= rDifference
      ? -initialQ - roundedY
      : initialR;
  return { q: roundedQ, r: roundedR };
}

/** Projected-point math that matches DuckDB grid-cell SQL. */
export const GridCellMath = {
  /** Rounds half away from zero, matching DuckDB `round()` on .5 ties. */
  roundHalfAwayFromZero: _roundHalfAwayFromZero,

  /** Gets the integer square-grid coordinates containing a projected point. */
  getSquareCellIdFromPoint: (options: {
    x: number;
    y: number;
    sizeMeters: number;
  }): [number, number] => {
    return [
      Math.floor(options.x / options.sizeMeters),
      Math.floor(options.y / options.sizeMeters),
    ];
  },

  /** Gets pointy-top axial coordinates containing a projected point. */
  getPointyTopAxialCellFromPoint: (options: {
    x: number;
    y: number;
    sizeMeters: number;
  }): { q: number; r: number } => {
    return _roundCubeCoordinates(
      options.x / options.sizeMeters -
        options.y / (Math.sqrt(3) * options.sizeMeters),
      (2 * options.y) / (Math.sqrt(3) * options.sizeMeters),
    );
  },
};
