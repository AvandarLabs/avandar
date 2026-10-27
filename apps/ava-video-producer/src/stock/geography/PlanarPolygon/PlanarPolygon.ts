import { binary64ToInteger } from "./binary64ToInteger";
type Point = readonly [number, number];

type Ring = readonly Point[];

type Triangle = { first: Point; second: Point; third: Point };

function _isFinitePoint(point: Point): boolean {
  return point.length === 2 && point.every(Number.isFinite);
}

function _orientation({ first, second, third }: Readonly<Triangle>): number {
  const [firstX, firstY] = first.map(binary64ToInteger);
  const [secondX, secondY] = second.map(binary64ToInteger);
  const [thirdX, thirdY] = third.map(binary64ToInteger);
  const determinant =
    (secondX - firstX) * (thirdY - firstY) -
    (secondY - firstY) * (thirdX - firstX);
  return determinant > 0n ? 1 : determinant < 0n ? -1 : 0;
}

function _onSegment({ first, second, third }: Readonly<Triangle>): boolean {
  return (
    _orientation({ first, second, third }) === 0 &&
    third[0] >= Math.min(first[0], second[0]) &&
    third[0] <= Math.max(first[0], second[0]) &&
    third[1] >= Math.min(first[1], second[1]) &&
    third[1] <= Math.max(first[1], second[1])
  );
}

function _segmentsMeet({
  first,
  second,
  third,
  fourth,
}: Readonly<Triangle & { fourth: Point }>): boolean {
  const signs = [
    _orientation({ first, second, third }),
    _orientation({ first, second, third: fourth }),
    _orientation({ first: third, second: fourth, third: first }),
    _orientation({ first: third, second: fourth, third: second }),
  ];
  return (
    (signs[0] * signs[1] < 0 && signs[2] * signs[3] < 0) ||
    _onSegment({ first, second, third }) ||
    _onSegment({ first, second, third: fourth }) ||
    _onSegment({ first: third, second: fourth, third: first }) ||
    _onSegment({ first: third, second: fourth, third: second })
  );
}

function _hasInvalidEdges(polygon: Ring): boolean {
  return polygon.some((first, index) => {
    const second = polygon[(index + 1) % polygon.length];
    const third = polygon[(index + 2) % polygon.length];
    if (
      _onSegment({ first, second, third }) ||
      _onSegment({ first: second, second: third, third: first })
    ) {
      return true;
    }
    return polygon.some((otherStart, otherIndex) => {
      if (
        otherIndex <= index ||
        otherIndex === index + 1 ||
        (index === 0 && otherIndex === polygon.length - 1)
      ) {
        return false;
      }
      return _segmentsMeet({
        first,
        second,
        third: otherStart,
        fourth: polygon[(otherIndex + 1) % polygon.length],
      });
    });
  });
}

/**
 * Validates a finite simple open ring, with no repeated closing vertex.
 * Concavity, either winding and nonoverlapping collinear vertices are valid.
 * Exact binary64 determinant signs impose no minimum area or tolerance band.
 */
function _isSimplePolygon({ polygon }: Readonly<{ polygon: Ring }>): boolean {
  if (polygon.length < 3 || !polygon.every(_isFinitePoint)) {
    return false;
  }
  const identities = polygon.map(([x, y]) => `${x},${y}`);
  return (
    new Set(identities).size === polygon.length && !_hasInvalidEdges(polygon)
  );
}

/**
 * Classifies a finite point against an already validated simple open ring.
 * Callers choose their own boundary policy. No epsilon widens the boundary.
 * Nonfinite points or rings with fewer than three vertices throw. Simplicity
 * must be validated by the caller with isSimplePolygon before classification.
 */
function _getPointClassificationFromPolygon({
  point,
  polygon,
}: Readonly<{ point: Point; polygon: Ring }>):
  | "inside"
  | "outside"
  | "boundary" {
  if (
    !_isFinitePoint(point) ||
    polygon.length < 3 ||
    !polygon.every(_isFinitePoint)
  ) {
    throw new Error(
      "Point classification requires finite geometry and a validated simple ring.",
    );
  }
  let isInside = false;
  for (let index = 0; index < polygon.length; index += 1) {
    const first = polygon[index];
    const second = polygon[(index + 1) % polygon.length];
    if (_onSegment({ first, second, third: point })) {
      return "boundary";
    }
    if (first[1] > point[1] !== second[1] > point[1]) {
      const sign = _orientation({ first, second, third: point });
      if (
        (second[1] > first[1] && sign > 0) ||
        (second[1] < first[1] && sign < 0)
      ) {
        isInside = !isInside;
      }
    }
  }
  return isInside ? "inside" : "outside";
}

type ExactPoint = readonly [bigint, bigint];

type EdgePair = { first: Point; second: Point; third: Point; fourth: Point };

type OrientedEdges = EdgePair & { firstWinding: number; secondWinding: number };

function _getWinding(polygon: Ring): number {
  const area = polygon.reduce((sum, point, index) => {
    const following = polygon[(index + 1) % polygon.length];
    return (
      sum +
      binary64ToInteger(point[0]) * binary64ToInteger(following[1]) -
      binary64ToInteger(point[1]) * binary64ToInteger(following[0])
    );
  }, 0n);
  return area > 0n ? 1 : -1;
}

function _isExactMidpointInside({
  first,
  second,
  polygon,
}: Readonly<{ first: Point; second: Point; polygon: Ring }>): boolean {
  const point: ExactPoint = [
    binary64ToInteger(first[0]) + binary64ToInteger(second[0]),
    binary64ToInteger(first[1]) + binary64ToInteger(second[1]),
  ];
  let isInside = false;
  let isBoundary = false;
  polygon.forEach((vertex, index) => {
    const following = polygon[(index + 1) % polygon.length];
    const start = vertex.map((value) => binary64ToInteger(value) * 2n);
    const end = following.map((value) => binary64ToInteger(value) * 2n);
    const cross =
      (end[0] - start[0]) * (point[1] - start[1]) -
      (end[1] - start[1]) * (point[0] - start[0]);
    if (
      cross === 0n &&
      point[0] >= (start[0] < end[0] ? start[0] : end[0]) &&
      point[0] <= (start[0] > end[0] ? start[0] : end[0]) &&
      point[1] >= (start[1] < end[1] ? start[1] : end[1]) &&
      point[1] <= (start[1] > end[1] ? start[1] : end[1])
    ) {
      isBoundary = true;
    }
    if (
      start[1] > point[1] !== end[1] > point[1] &&
      (end[1] > start[1] ? cross > 0n : cross < 0n)
    ) {
      isInside = !isInside;
    }
  });
  return isInside && !isBoundary;
}

function _hasInteriorEdge({
  firstPolygon,
  secondPolygon,
}: Readonly<{ firstPolygon: Ring; secondPolygon: Ring }>): boolean {
  return firstPolygon.some((first, index) => {
    const second = firstPolygon[(index + 1) % firstPolygon.length];
    const axis = first[0] === second[0] ? 1 : 0;
    const splits = [
      first,
      second,
      ...secondPolygon.filter((third) => _onSegment({ first, second, third })),
    ].sort((left, right) => left[axis] - right[axis]);
    return splits.slice(1).some((end, splitIndex) =>
      _isExactMidpointInside({
        first: splits[splitIndex],
        second: end,
        polygon: secondPolygon,
      }),
    );
  });
}

function _edgesShareInterior({
  first,
  second,
  third,
  fourth,
  firstWinding,
  secondWinding,
}: Readonly<OrientedEdges>): boolean {
  const firstSign = _orientation({ first, second, third });
  const secondSign = _orientation({ first, second, third: fourth });
  const thirdSign = _orientation({
    first: third,
    second: fourth,
    third: first,
  });
  const fourthSign = _orientation({
    first: third,
    second: fourth,
    third: second,
  });
  if (firstSign * secondSign < 0 && thirdSign * fourthSign < 0) {
    return true;
  }
  if (firstSign !== 0 || secondSign !== 0) {
    return false;
  }
  const axis = first[0] === second[0] ? 1 : 0;
  const overlaps =
    Math.max(
      Math.min(first[axis], second[axis]),
      Math.min(third[axis], fourth[axis]),
    ) <
    Math.min(
      Math.max(first[axis], second[axis]),
      Math.max(third[axis], fourth[axis]),
    );
  const sameDirection =
    second[axis] > first[axis] === fourth[axis] > third[axis];
  return (
    overlaps &&
    (sameDirection
      ? firstWinding === secondWinding
      : firstWinding !== secondWinding)
  );
}

/**
 * Detects interior overlap of already validated simple finite open rings.
 * Shared borders or vertices alone are allowed. Exact binary64 predicates
 * and rational midpoint probes preserve subnormal and concave interiors.
 * Callers must validate each ring with isSimplePolygon first.
 */
function _doPolygonInteriorsOverlap({
  firstPolygon,
  secondPolygon,
}: Readonly<{ firstPolygon: Ring; secondPolygon: Ring }>): boolean {
  const firstWinding = _getWinding(firstPolygon);
  const secondWinding = _getWinding(secondPolygon);
  return (
    _hasInteriorEdge({ firstPolygon, secondPolygon }) ||
    _hasInteriorEdge({
      firstPolygon: secondPolygon,
      secondPolygon: firstPolygon,
    }) ||
    firstPolygon.some((first, index) =>
      secondPolygon.some((third, otherIndex) =>
        _edgesShareInterior({
          first,
          second: firstPolygon[(index + 1) % firstPolygon.length],
          third,
          fourth: secondPolygon[(otherIndex + 1) % secondPolygon.length],
          firstWinding,
          secondWinding,
        }),
      ),
    )
  );
}

type Disk = { center: Point; radius: number; polygon: Ring };

function _diskMeetsEdge({
  center,
  radius,
  first,
  second,
}: Readonly<Omit<Disk, "polygon"> & { first: Point; second: Point }>): boolean {
  const [centerX, centerY] = center.map(binary64ToInteger);
  const [firstX, firstY] = first.map(binary64ToInteger);
  const [secondX, secondY] = second.map(binary64ToInteger);
  const deltaX = secondX - firstX;
  const deltaY = secondY - firstY;
  const offsetX = centerX - firstX;
  const offsetY = centerY - firstY;
  const squaredLength = deltaX * deltaX + deltaY * deltaY;
  const projection = offsetX * deltaX + offsetY * deltaY;
  const exactRadius = binary64ToInteger(radius);
  const squaredRadius = exactRadius * exactRadius;
  if (projection <= 0n) {
    return offsetX * offsetX + offsetY * offsetY <= squaredRadius;
  }
  if (projection >= squaredLength) {
    const endX = centerX - secondX;
    const endY = centerY - secondY;
    return endX * endX + endY * endY <= squaredRadius;
  }
  const cross = offsetX * deltaY - offsetY * deltaX;
  return cross * cross <= squaredRadius * squaredLength;
}

/**
 * Classifies a finite closed disk against a validated simple finite open ring.
 * Inside requires strict full-disk containment. Any boundary contact, including
 * a zero-radius boundary point or a disk enclosing the ring, is intersecting.
 * Exact binary64 squared distances impose no tolerance or minimum feature size.
 */
function _getDiskClassificationFromPolygon({
  center,
  radius,
  polygon,
}: Readonly<Disk>): "inside" | "intersecting" | "outside" {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new Error("Disk radius must be finite and nonnegative.");
  }
  const pointState = _getPointClassificationFromPolygon({
    point: center,
    polygon,
  });
  if (
    polygon.some((first, index) =>
      _diskMeetsEdge({
        center,
        radius,
        first,
        second: polygon[(index + 1) % polygon.length],
      }),
    )
  ) {
    return "intersecting";
  }
  return pointState === "inside" ? "inside" : "outside";
}

/** Related planar polygon operations. */
export const PlanarPolygon = {
  /**
   * Validates a finite simple open ring, with no repeated closing vertex.
   * Concavity, either winding and nonoverlapping collinear vertices are valid.
   * Exact binary64 determinant signs impose no minimum area or tolerance band.
   */
  isSimple: _isSimplePolygon,
  /**
   * Classifies a finite point against an already validated simple open ring.
   * Callers choose their own boundary policy. No epsilon widens the boundary.
   * Nonfinite points or rings with fewer than three vertices throw. Simplicity
   * must be validated by the caller with isSimplePolygon before classification.
   */
  getPointClassification: _getPointClassificationFromPolygon,
  /**
   * Detects interior overlap of already validated simple finite open rings.
   * Shared borders or vertices alone are allowed. Exact binary64 predicates
   * and rational midpoint probes preserve subnormal and concave interiors.
   * Callers must validate each ring with isSimplePolygon first.
   */
  doInteriorsOverlap: _doPolygonInteriorsOverlap,
  /**
   * Classifies a finite closed disk against a validated simple finite open
   * ring.
   * Inside requires strict full-disk containment. Any boundary contact,
   * including
   * a zero-radius boundary point or a disk enclosing the ring, is intersecting.
   * Exact binary64 squared distances impose no tolerance or minimum feature
   * size.
   */
  getDiskClassification: _getDiskClassificationFromPolygon,
} satisfies {
  isSimple: typeof _isSimplePolygon;
  getPointClassification: typeof _getPointClassificationFromPolygon;
  doInteriorsOverlap: typeof _doPolygonInteriorsOverlap;
  getDiskClassification: typeof _getDiskClassificationFromPolygon;
};
