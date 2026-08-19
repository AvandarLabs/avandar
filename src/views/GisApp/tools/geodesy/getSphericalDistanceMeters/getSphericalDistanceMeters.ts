import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

type Vertex = readonly [number, number];

function _toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function _haversineMeters(from: Vertex, to: Vertex): number {
  const fromLatitude = _toRadians(from[1]);
  const toLatitude = _toRadians(to[1]);
  const deltaLatitude = toLatitude - fromLatitude;
  const deltaLongitude = _toRadians(to[0] - from[0]);
  const halfChordLatitude = Math.sin(deltaLatitude / 2);
  const halfChordLongitude = Math.sin(deltaLongitude / 2);
  const chordLength =
    halfChordLatitude * halfChordLatitude +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      halfChordLongitude *
      halfChordLongitude;
  return (
    2 *
    AvaMapConfig.GisWaveDDefaults.earthRadiusMeters *
    Math.atan2(Math.sqrt(chordLength), Math.sqrt(1 - chordLength))
  );
}

/**
 * Geodesic length of a lng/lat path using haversine on the mean Earth sphere.
 */
export function getSphericalDistanceMeters(
  path: ReadonlyArray<readonly [number, number]>,
): number {
  if (path.length < 2) {
    return 0;
  }
  return path.slice(1).reduce((totalMeters, vertex, index) => {
    const previousVertex = path[index];
    if (!previousVertex) {
      return totalMeters;
    }
    return totalMeters + _haversineMeters(previousVertex, vertex);
  }, 0);
}
