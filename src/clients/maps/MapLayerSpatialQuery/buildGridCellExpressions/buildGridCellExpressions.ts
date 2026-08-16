import { quoteSqlLiteral } from "@avandar/utils/sql";

type GridCellExpressions = {
  cellIdExpression: string;
  geometryExpression: string;
};

function _buildQuotedSizeExpression(sizeMeters: number): string {
  return `CAST(${quoteSqlLiteral(String(sizeMeters))} AS DOUBLE)`;
}

function _buildSquareExpressions(
  xExpression: string,
  yExpression: string,
  sizeExpression: string,
): GridCellExpressions {
  const column = `floor(${xExpression} / ${sizeExpression})`;
  const row = `floor(${yExpression} / ${sizeExpression})`;
  const minimumX = `(${column} * ${sizeExpression})`;
  const minimumY = `(${row} * ${sizeExpression})`;
  return {
    cellIdExpression:
      `concat(CAST(${column} AS BIGINT), ':', ` + `CAST(${row} AS BIGINT))`,
    geometryExpression:
      `ST_MakeEnvelope(${minimumX}, ${minimumY}, ` +
      `${minimumX} + ${sizeExpression}, ${minimumY} + ${sizeExpression})`,
  };
}

function _buildRoundedAxialExpressions(
  xExpression: string,
  yExpression: string,
  sizeExpression: string,
): { q: string; r: string } {
  const q = `((${xExpression} / ${sizeExpression}) - (${yExpression} / (sqrt(3) * ${sizeExpression})))`;
  const r = `((2 * ${yExpression}) / (sqrt(3) * ${sizeExpression}))`;
  const cubeY = `(-${q} - ${r})`;
  const qDifference = `abs(round(${q}) - ${q})`;
  const yDifference = `abs(round(${cubeY}) - ${cubeY})`;
  const rDifference = `abs(round(${r}) - ${r})`;
  const roundedQ =
    `CASE WHEN ${qDifference} > ${yDifference} ` +
    `AND ${qDifference} > ${rDifference} ` +
    `THEN -round(${cubeY}) - round(${r}) ELSE round(${q}) END`;
  const roundedR =
    `CASE WHEN ${qDifference} > ${yDifference} ` +
    `AND ${qDifference} > ${rDifference} THEN round(${r}) ` +
    `WHEN ${yDifference} > ${rDifference} THEN round(${r}) ` +
    `ELSE -round(${q}) - round(${cubeY}) END`;
  return { q: `(${roundedQ})`, r: `(${roundedR})` };
}

function _buildHexGeometryExpression(
  q: string,
  r: string,
  sizeExpression: string,
): string {
  const centerX = `(${sizeExpression} * (${q} + (${r} / 2)))`;
  const centerY = `(sqrt(3) * ${sizeExpression} * ${r} / 2)`;
  const radius = `(${sizeExpression} / sqrt(3))`;
  const vertices = [
    `ST_Point(${centerX}, ${centerY} + ${radius})`,
    `ST_Point(${centerX} + ${sizeExpression} / 2, ${centerY} + ${radius} / 2)`,
    `ST_Point(${centerX} + ${sizeExpression} / 2, ${centerY} - ${radius} / 2)`,
    `ST_Point(${centerX}, ${centerY} - ${radius})`,
    `ST_Point(${centerX} - ${sizeExpression} / 2, ${centerY} - ${radius} / 2)`,
    `ST_Point(${centerX} - ${sizeExpression} / 2, ${centerY} + ${radius} / 2)`,
  ];
  return `ST_MakePolygon(ST_MakeLine([${[...vertices, vertices[0]].join(", ")}]))`;
}

function _buildHexExpressions(
  xExpression: string,
  yExpression: string,
  sizeExpression: string,
): GridCellExpressions {
  const { q, r } = _buildRoundedAxialExpressions(
    xExpression,
    yExpression,
    sizeExpression,
  );
  return {
    cellIdExpression: `concat(CAST(${q} AS BIGINT), ':', CAST(${r} AS BIGINT))`,
    geometryExpression: _buildHexGeometryExpression(q, r, sizeExpression),
  };
}

/** Rounds half away from zero, matching DuckDB `round()` on .5 ties. */
export function _roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
}

function _roundCubeCoordinates(q: number, r: number): { q: number; r: number } {
  const cubeY = -q - r;
  let roundedQ = _roundHalfAwayFromZero(q);
  const roundedY = _roundHalfAwayFromZero(cubeY);
  let roundedR = _roundHalfAwayFromZero(r);
  const qDifference = Math.abs(roundedQ - q);
  const yDifference = Math.abs(roundedY - cubeY);
  const rDifference = Math.abs(roundedR - r);
  if (qDifference > yDifference && qDifference > rDifference) {
    roundedQ = -roundedY - roundedR;
  } else if (yDifference <= rDifference) {
    roundedR = -roundedQ - roundedY;
  }
  return { q: roundedQ, r: roundedR };
}

/** Gets the integer square-grid coordinates containing a projected point. */
export function getSquareCellId(
  x: number,
  y: number,
  sizeMeters: number,
): [number, number] {
  return [Math.floor(x / sizeMeters), Math.floor(y / sizeMeters)];
}

/** Gets pointy-top axial coordinates containing a projected point. */
export function getPointyTopAxialCell(
  x: number,
  y: number,
  sizeMeters: number,
): { q: number; r: number } {
  return _roundCubeCoordinates(
    x / sizeMeters - y / (Math.sqrt(3) * sizeMeters),
    (2 * y) / (Math.sqrt(3) * sizeMeters),
  );
}

/** Builds stable cell-id and polygon expressions for a projected point. */
export function buildGridCellExpressions(
  options: Readonly<{
    grid: "hex" | "square";
    xExpression: string;
    yExpression: string;
    sizeMeters: number;
  }>,
): GridCellExpressions {
  const sizeExpression = _buildQuotedSizeExpression(options.sizeMeters);
  if (options.grid === "square") {
    return _buildSquareExpressions(
      options.xExpression,
      options.yExpression,
      sizeExpression,
    );
  }
  return _buildHexExpressions(
    options.xExpression,
    options.yExpression,
    sizeExpression,
  );
}
