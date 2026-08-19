type Vertex = readonly [number, number];

/**
 * Closed rectangle ring from two opposite corners, or empty when area is zero.
 */
export function makeRectangleRing(
  a: Vertex,
  b: Vertex,
): Array<[number, number]> {
  const minLng = Math.min(a[0], b[0]);
  const maxLng = Math.max(a[0], b[0]);
  const minLat = Math.min(a[1], b[1]);
  const maxLat = Math.max(a[1], b[1]);
  if (minLng === maxLng || minLat === maxLat) {
    return [];
  }
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ];
}
