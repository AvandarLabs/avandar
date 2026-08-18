import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

type Vertex = readonly [number, number];

function _toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function _areVerticesEqual(left: Vertex, right: Vertex): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function _closedRing(ring: readonly Vertex[]): readonly Vertex[] | undefined {
  const firstVertex = ring[0];
  const lastVertex = ring[ring.length - 1];
  if (
    !firstVertex ||
    !lastVertex ||
    ring.length < 4 ||
    !_areVerticesEqual(firstVertex, lastVertex)
  ) {
    return undefined;
  }
  return ring;
}

function _sphericalExcess(ring: readonly Vertex[]): number {
  return ring.slice(0, -1).reduce((totalExcess, vertex, index) => {
    const nextVertex = ring[index + 1];
    if (!nextVertex) {
      return totalExcess;
    }
    const latitude = _toRadians(vertex[1]);
    const nextLatitude = _toRadians(nextVertex[1]);
    const deltaLongitude = _toRadians(nextVertex[0] - vertex[0]);
    return (
      totalExcess +
      deltaLongitude * (2 + Math.sin(latitude) + Math.sin(nextLatitude))
    );
  }, 0);
}

/**
 * Area of a closed lng/lat ring via spherical excess on the mean Earth sphere.
 */
export function getSphericalPolygonAreaSquareMeters(
  ring: ReadonlyArray<readonly [number, number]>,
): number {
  const closedRing = _closedRing(ring);
  if (!closedRing) {
    return 0;
  }
  const radiusMeters = AvaMapConfig.GisWaveDDefaults.earthRadiusMeters;
  return Math.abs(
    (_sphericalExcess(closedRing) * radiusMeters * radiusMeters) / 2,
  );
}
