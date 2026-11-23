import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * One cell read as encoded geometry.
 *
 * `sourceCrs` is set only for an explicit SRID other than WGS 84. Map binding
 * uses that to tell a projected column from one already in degrees.
 */
export type ClassifiedGeometryValue = {
  encoding: MapLayer.GeometryEncoding;
  family: MapLayer.GeometryFamily;
  sourceCrs: number | undefined;
};

const WKT_PATTERN =
  /^(?:SRID=(\d+)\s*;\s*)?(MULTI(?:POINT|LINESTRING|POLYGON)|POINT|LINESTRING|POLYGON)(?:\s*ZM|\s*Z|\s*M)?\s*\(\s*(?:\(\s*)*-?\d/i;

const GEOJSON_FAMILY_BY_TYPE: Record<string, MapLayer.GeometryFamily> = {
  Point: "point",
  MultiPoint: "point",
  LineString: "line",
  MultiLineString: "line",
  Polygon: "polygon",
  MultiPolygon: "polygon",
};

const WKB_FAMILY_BY_BASE: Record<number, MapLayer.GeometryFamily> = {
  1: "point",
  2: "line",
  3: "polygon",
  4: "point",
  5: "line",
  6: "polygon",
};

const WKB_SRID_FLAG = 0x20000000;
const WGS84_SRID = 4326;

function _familyFromTypeName(
  typeName: string,
): MapLayer.GeometryFamily | undefined {
  const type = typeName.toUpperCase();
  if (type === "POINT" || type === "MULTIPOINT") {
    return "point";
  }
  if (type === "LINESTRING" || type === "MULTILINESTRING") {
    return "line";
  }
  if (type === "POLYGON" || type === "MULTIPOLYGON") {
    return "polygon";
  }
  return undefined;
}

function _sourceCrsFromSrid(srid: number): number | undefined {
  if (!Number.isFinite(srid) || srid === 0 || srid === WGS84_SRID) {
    return undefined;
  }
  return srid;
}

function _unwrapQuotedText(value: string): string {
  const trimmed = value.trim().replace(/^\uFEFF/, "");
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replaceAll('""', '"').trim();
  }
  return trimmed;
}

function _classifyWkt(text: string): ClassifiedGeometryValue | undefined {
  const match = WKT_PATTERN.exec(text);
  const family = _familyFromTypeName(match?.[2] ?? "");
  if (!match || !family) {
    return undefined;
  }
  const srid = match[1] ? Number.parseInt(match[1], 10) : undefined;
  return {
    encoding: "wkt",
    family,
    sourceCrs: srid === undefined ? undefined : _sourceCrsFromSrid(srid),
  };
}

function _hasFiniteNumber(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some(_hasFiniteNumber);
}

function _classifyFeatureCollection(
  features: unknown,
): ClassifiedGeometryValue | undefined {
  if (!Array.isArray(features)) {
    return undefined;
  }
  const classified = features.flatMap((feature) => {
    if (typeof feature !== "object" || feature === null) {
      return [];
    }
    const geometry = _classifyGeoJsonGeometry(
      (feature as { geometry?: unknown }).geometry,
    );
    return geometry ? [geometry] : [];
  });
  const first = classified[0];
  if (
    !first ||
    classified.some((item) => {
      return item.family !== first.family;
    })
  ) {
    return undefined;
  }
  return first;
}

function _classifyGeoJsonGeometry(
  value: unknown,
): ClassifiedGeometryValue | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as {
    type?: unknown;
    coordinates?: unknown;
    geometry?: unknown;
    features?: unknown;
  };
  if (record.type === "Feature") {
    return _classifyGeoJsonGeometry(record.geometry);
  }
  if (record.type === "FeatureCollection") {
    return _classifyFeatureCollection(record.features);
  }
  if (typeof record.type !== "string") {
    return undefined;
  }
  const family = GEOJSON_FAMILY_BY_TYPE[record.type];
  if (!family || !_hasFiniteNumber(record.coordinates)) {
    return undefined;
  }
  return { encoding: "geojson", family, sourceCrs: undefined };
}

function _classifyGeoJsonText(
  text: string,
): ClassifiedGeometryValue | undefined {
  try {
    return _classifyGeoJsonGeometry(JSON.parse(text) as unknown);
  } catch {
    return undefined;
  }
}

function _bytesFromHex(text: string): Uint8Array | undefined {
  const stripped = text.replace(/^0x/i, "").replace(/\s+/g, "");
  if (
    stripped.length < 42 ||
    stripped.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(stripped)
  ) {
    return undefined;
  }
  const pairs = stripped.match(/../g);
  if (!pairs) {
    return undefined;
  }
  return Uint8Array.from(
    pairs.map((pair) => {
      return Number.parseInt(pair, 16);
    }),
  );
}

function _familyFromWkbType(
  typeCode: number,
): MapLayer.GeometryFamily | undefined {
  const base = typeCode >= 1000 && typeCode < 4000 ? typeCode % 1000 : typeCode;
  return WKB_FAMILY_BY_BASE[base];
}

function _classifyWkb(bytes: Uint8Array): ClassifiedGeometryValue | undefined {
  if (bytes.length < 21 || (bytes[0] !== 0 && bytes[0] !== 1)) {
    return undefined;
  }
  const littleEndian = bytes[0] === 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const typeCode = view.getUint32(1, littleEndian);
  const hasSrid = (typeCode & WKB_SRID_FLAG) !== 0;
  if (hasSrid && bytes.length < 25) {
    return undefined;
  }
  const payloadStart = hasSrid ? 9 : 5;
  const family = _familyFromWkbType(typeCode & 0x0fffffff);
  if (!family || bytes.length < payloadStart + 16) {
    return undefined;
  }
  const srid = hasSrid ? view.getUint32(5, littleEndian) : undefined;
  return {
    encoding: "wkb",
    family,
    sourceCrs: srid === undefined ? undefined : _sourceCrsFromSrid(srid),
  };
}

function _bytesFromValue(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return undefined;
}

/**
 * Reads one cell as WKT, WKB, or GeoJSON, including its geometry family.
 *
 * Map binding uses it to tell a `location` column of points from an address
 * column of the same name, for example a school survey row.
 */
export function classifyGeometryValue(
  value: unknown,
): ClassifiedGeometryValue | undefined {
  const bytes = _bytesFromValue(value);
  if (bytes) {
    return _classifyWkb(bytes);
  }
  if (typeof value === "object" && value !== null) {
    return _classifyGeoJsonGeometry(value);
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const text = _unwrapQuotedText(value);
  if (text.startsWith("{") || text.startsWith("[")) {
    return _classifyGeoJsonText(text);
  }
  const wkt = _classifyWkt(text);
  if (wkt) {
    return wkt;
  }
  const hex = _bytesFromHex(text);
  return hex ? _classifyWkb(hex) : undefined;
}

/**
 * Whether any sampled cell is WKT, WKB, or GeoJSON.
 *
 * An address column is false, so a geometry binding already pointed at a real
 * geometry column is left alone.
 */
export function columnHasRecognizedGeometryValue(
  sampleValues: readonly unknown[],
): boolean {
  return sampleValues.some((value) => {
    return classifyGeometryValue(value) !== undefined;
  });
}
