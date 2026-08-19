/** A parsed go-to search: a coordinate, a P-code, or an invalid query. */
export type MapGoToQuery =
  | { type: "coordinate"; longitude: number; latitude: number }
  | { type: "pcode"; code: string }
  | { type: "invalid"; reason: "unparsed" | "outOfRange" };

function _parseNumberPair(value: string): [number, number] | undefined {
  const parts = value.split(/[,\s]+/).filter((part) => {
    return part.length > 0;
  });
  if (parts.length !== 2) {
    return undefined;
  }
  const first = Number(parts[0]);
  const second = Number(parts[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return undefined;
  }
  return [first, second];
}

function _getCoordinateFromPair(
  first: number,
  second: number,
): Extract<MapGoToQuery, { type: "coordinate" | "invalid" }> {
  const firstIsLongitude = Math.abs(first) > 90;
  const secondIsLongitude = Math.abs(second) > 90;
  const latitude = firstIsLongitude && !secondIsLongitude ? second : first;
  const longitude = firstIsLongitude && !secondIsLongitude ? first : second;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { type: "invalid", reason: "outOfRange" };
  }
  return { type: "coordinate", longitude, latitude };
}

/** Parses a go-to search into a coordinate, a P-code, or an invalid query. */
export function parseMapGoToQuery(value: string): MapGoToQuery {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { type: "invalid", reason: "unparsed" };
  }
  const pair = _parseNumberPair(trimmed);
  if (pair) {
    return _getCoordinateFromPair(pair[0], pair[1]);
  }
  return { type: "pcode", code: trimmed };
}
