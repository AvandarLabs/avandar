type Vertex = readonly [number, number];

function _areVerticesEqual(left: Vertex, right: Vertex): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function _crossProduct(options: {
  origin: Vertex;
  first: Vertex;
  second: Vertex;
}): number {
  const { origin, first, second } = options;
  return (
    (first[0] - origin[0]) * (second[1] - origin[1]) -
    (first[1] - origin[1]) * (second[0] - origin[0])
  );
}

function _isVertexOnSegment(options: {
  vertex: Vertex;
  start: Vertex;
  end: Vertex;
}): boolean {
  const { vertex, start, end } = options;
  return (
    vertex[0] >= Math.min(start[0], end[0]) &&
    vertex[0] <= Math.max(start[0], end[0]) &&
    vertex[1] >= Math.min(start[1], end[1]) &&
    vertex[1] <= Math.max(start[1], end[1])
  );
}

function _doSegmentsIntersect(
  startA: Vertex,
  endA: Vertex,
  startB: Vertex,
  endB: Vertex,
): boolean {
  const d1 = _crossProduct({ origin: startB, first: endB, second: startA });
  const d2 = _crossProduct({ origin: startB, first: endB, second: endA });
  const d3 = _crossProduct({ origin: startA, first: endA, second: startB });
  const d4 = _crossProduct({ origin: startA, first: endA, second: endB });
  const abStraddles = (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0);
  const cdStraddles = (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0);
  if (abStraddles && cdStraddles) {
    return true;
  }
  if (
    d1 === 0 &&
    _isVertexOnSegment({ vertex: startA, start: startB, end: endB })
  ) {
    return true;
  }
  if (
    d2 === 0 &&
    _isVertexOnSegment({ vertex: endA, start: startB, end: endB })
  ) {
    return true;
  }
  if (
    d3 === 0 &&
    _isVertexOnSegment({ vertex: startB, start: startA, end: endA })
  ) {
    return true;
  }
  if (
    d4 === 0 &&
    _isVertexOnSegment({ vertex: endB, start: startA, end: endA })
  ) {
    return true;
  }
  return false;
}

function _areEdgesAdjacent(
  leftIndex: number,
  rightIndex: number,
  edgeCount: number,
): boolean {
  if (rightIndex === leftIndex + 1) {
    return true;
  }
  return leftIndex === 0 && rightIndex === edgeCount - 1;
}

function _hasConsecutiveDuplicate(ring: readonly Vertex[]): boolean {
  return ring.some((vertex, index) => {
    const nextVertex = ring[index + 1];
    return nextVertex !== undefined && _areVerticesEqual(vertex, nextVertex);
  });
}

function _hasSelfIntersectingSegments(ring: readonly Vertex[]): boolean {
  const edges = ring.slice(0, -1);
  return edges.some((_leftEdge, leftIndex) => {
    return edges.some((_rightEdge, rightIndex) => {
      if (rightIndex <= leftIndex) {
        return false;
      }
      if (_areEdgesAdjacent(leftIndex, rightIndex, edges.length)) {
        return false;
      }
      const startA = ring[leftIndex];
      const endA = ring[leftIndex + 1];
      const startB = ring[rightIndex];
      const endB = ring[rightIndex + 1];
      if (!startA || !endA || !startB || !endB) {
        return false;
      }
      return _doSegmentsIntersect(startA, endA, startB, endB);
    });
  });
}

/**
 * True when `ring` is a closed simple polygon: at least four positions, first
 * equals last, no consecutive duplicate vertices, and no self-crossing
 * segments. Adjacent edges that share an endpoint are not crossings.
 */
export function isClosedRingValid(
  ring: ReadonlyArray<[number, number]>,
): boolean {
  if (ring.length < 4) {
    return false;
  }
  const firstVertex = ring[0];
  const lastVertex = ring[ring.length - 1];
  if (
    !firstVertex ||
    !lastVertex ||
    !_areVerticesEqual(firstVertex, lastVertex)
  ) {
    return false;
  }
  if (_hasConsecutiveDuplicate(ring)) {
    return false;
  }
  return !_hasSelfIntersectingSegments(ring);
}
