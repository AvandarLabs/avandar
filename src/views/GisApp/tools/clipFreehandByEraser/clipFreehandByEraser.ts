type Point = { x: number; y: number };
type Vertex = readonly [number, number];

function _isInside(point: Point, center: Point, radiusPx: number): boolean {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return dx * dx + dy * dy <= radiusPx * radiusPx;
}

function _samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

function _lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Parameter t in [0, 1] where segment AB meets the brush circle. */
function _segmentCircleHits(
  a: Point,
  b: Point,
  center: Point,
  radiusPx: number,
): number[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const fx = a.x - center.x;
  const fy = a.y - center.y;
  const quadA = dx * dx + dy * dy;
  if (quadA === 0) {
    return [];
  }
  const quadB = 2 * (fx * dx + fy * dy);
  const quadC = fx * fx + fy * fy - radiusPx * radiusPx;
  const disc = quadB * quadB - 4 * quadA * quadC;
  if (disc < 0) {
    return [];
  }
  const root = Math.sqrt(disc);
  return [(-quadB - root) / (2 * quadA), (-quadB + root) / (2 * quadA)]
    .filter((t) => {
      return t >= 0 && t <= 1;
    })
    .sort((left, right) => {
      return left - right;
    });
}

function _keptSegmentPieces(
  a: Point,
  b: Point,
  eraser: Point,
  radiusPx: number,
): Array<[Point, Point]> {
  const aIn = _isInside(a, eraser, radiusPx);
  const bIn = _isInside(b, eraser, radiusPx);
  const hits = _segmentCircleHits(a, b, eraser, radiusPx);
  if (aIn && bIn) {
    return [];
  }
  if (!aIn && !bIn) {
    if (hits.length < 2) {
      return [[a, b]];
    }
    const firstHit = hits[0];
    const secondHit = hits[1];
    if (firstHit === undefined || secondHit === undefined) {
      return [[a, b]];
    }
    return [
      [a, _lerp(a, b, firstHit)],
      [_lerp(a, b, secondHit), b],
    ];
  }
  const hitT = hits[0];
  if (hitT === undefined) {
    return aIn ? [] : [[a, b]];
  }
  const hit = _lerp(a, b, hitT);
  return aIn ? [[hit, b]] : [[a, hit]];
}

function _appendKeptSegment(pieces: Point[][], a: Point, b: Point): void {
  if (_samePoint(a, b)) {
    return;
  }
  const lastPiece = pieces[pieces.length - 1];
  const lastPoint = lastPiece?.[lastPiece.length - 1];
  if (lastPiece && lastPoint && _samePoint(lastPoint, a)) {
    lastPiece.push(b);
    return;
  }
  pieces.push([a, b]);
}

type Options = {
  coordinates: readonly Vertex[];
  eraser: Point;
  radiusPx: number;
  project: (vertex: Vertex) => Point;
  unproject: (point: Point) => [number, number];
};

/** Remaining freehand polylines after a screen-space eraser dab. */
export function clipFreehandByEraser(
  options: Options,
): Array<Array<[number, number]>> {
  const { coordinates, eraser, radiusPx, project, unproject } = options;
  const screenPieces: Point[][] = [];
  coordinates.forEach((vertex, index) => {
    const nextVertex = coordinates[index + 1];
    if (!nextVertex) {
      return;
    }
    _keptSegmentPieces(
      project(vertex),
      project(nextVertex),
      eraser,
      radiusPx,
    ).forEach(([start, end]) => {
      _appendKeptSegment(screenPieces, start, end);
    });
  });
  return screenPieces
    .filter((piece) => {
      return piece.length >= 2;
    })
    .map((piece) => {
      return piece.map(unproject);
    });
}
