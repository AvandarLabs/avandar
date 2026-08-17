import { isGeometryFamily } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerSpatialQueryColumns } from "../MapLayerSpatialQuery.constants";
import type { MapLayerSpatialDiagnostics } from "../MapLayerSpatialQuery.types";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

type ParsedMapLayerSpatialResult = {
  featureCollection: GeoJSON.FeatureCollection;
  diagnostics: MapLayerSpatialDiagnostics;
};

/** Parses a DuckDB JSON value that may already have been decoded. */
function _parseJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    return JSON.parse(value) as unknown;
  }
  return value;
}

/** Returns the render family represented by a GeoJSON geometry type. */
function _geometryTypeToFamily(
  geometryType: string,
): MapLayer.GeometryFamily | undefined {
  if (geometryType === "Point" || geometryType === "MultiPoint") {
    return "point";
  }
  if (geometryType === "LineString" || geometryType === "MultiLineString") {
    return "line";
  }
  if (geometryType === "Polygon" || geometryType === "MultiPolygon") {
    return "polygon";
  }
  return undefined;
}

/** True when `value` is a persisted geometry family string. */
function _isGeometryFamily(value: unknown): value is MapLayer.GeometryFamily {
  return typeof value === "string" && isGeometryFamily(value);
}

/** Picks a numeric diagnostic field when the payload contains one. */
function _pickNumericDiagnostic<Key extends string>(
  diagnostics: Record<string, unknown>,
  key: Key,
): Partial<Record<Key, number>> {
  const value = diagnostics[key];
  return typeof value === "number" ?
      ({ [key]: value } as Partial<Record<Key, number>>)
    : {};
}

/** Picks a string-array diagnostic field when every entry is a string. */
function _pickStringArrayDiagnostic<Key extends string>(
  diagnostics: Record<string, unknown>,
  key: Key,
): Partial<Record<Key, string[]>> {
  const value = diagnostics[key];
  return (
      Array.isArray(value) &&
        value.every((sample) => {
          return typeof sample === "string";
        })
    ) ?
      ({ [key]: value } as Partial<Record<Key, string[]>>)
    : {};
}

/** Parses optional boundary-match fields added by join queries. */
function _parseMatchDiagnostics(
  diagnostics: Record<string, unknown>,
): Partial<MapLayerSpatialDiagnostics> {
  return {
    ..._pickNumericDiagnostic(diagnostics, "matchedSourceKeyCount"),
    ..._pickNumericDiagnostic(diagnostics, "unmatchedSourceKeyCount"),
    ..._pickNumericDiagnostic(diagnostics, "unmatchedBoundaryCount"),
    ..._pickNumericDiagnostic(diagnostics, "duplicateBoundaryKeyCount"),
    ..._pickNumericDiagnostic(diagnostics, "ambiguousSourceKeyCount"),
    ..._pickStringArrayDiagnostic(diagnostics, "unmatchedSourceKeySamples"),
    ..._pickStringArrayDiagnostic(diagnostics, "duplicateBoundaryKeySamples"),
    ..._pickStringArrayDiagnostic(diagnostics, "ambiguousSourceKeySamples"),
  };
}

/** Parses optional drop and suppression fields added by bin queries. */
function _parseBinDiagnostics(
  diagnostics: Record<string, unknown>,
): Partial<MapLayerSpatialDiagnostics> {
  const isEmptyAfterDrops = diagnostics.isEmptyAfterDrops;
  return {
    ..._pickNumericDiagnostic(diagnostics, "nonPointCount"),
    ..._pickNumericDiagnostic(diagnostics, "suppressedCount"),
    ...(typeof isEmptyAfterDrops === "boolean" ? { isEmptyAfterDrops } : {}),
  };
}

/** Validates the stable diagnostics object returned by spatial SQL. */
function _parseDiagnostics(value: unknown): MapLayerSpatialDiagnostics {
  const parsed = _parseJsonValue(value);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Spatial diagnostics are missing or malformed");
  }
  const diagnostics = parsed as Record<string, unknown>;
  const observedFamilies = diagnostics.observedFamilies;
  if (
    typeof diagnostics.sourceCount !== "number" ||
    typeof diagnostics.parsedCount !== "number" ||
    typeof diagnostics.invalidCount !== "number" ||
    !Array.isArray(observedFamilies) ||
    !observedFamilies.every(_isGeometryFamily) ||
    typeof diagnostics.hasMixedFamilies !== "boolean"
  ) {
    throw new Error("Spatial diagnostics are missing or malformed");
  }
  return {
    sourceCount: diagnostics.sourceCount,
    parsedCount: diagnostics.parsedCount,
    invalidCount: diagnostics.invalidCount,
    observedFamilies,
    hasMixedFamilies: diagnostics.hasMixedFamilies,
    ..._parseMatchDiagnostics(diagnostics),
    ..._parseBinDiagnostics(diagnostics),
  };
}

/** Validates the GeoJSON envelope and every feature geometry family. */
function _parseFeatureCollection(
  value: unknown,
  family: MapLayer.GeometryFamily,
): GeoJSON.FeatureCollection {
  const parsed = _parseJsonValue(value);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("The spatial FeatureCollection is malformed");
  }
  const collection = parsed as Record<string, unknown>;
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features)
  ) {
    throw new Error("The spatial FeatureCollection is malformed");
  }
  const hasWrongFamily = collection.features.some((feature) => {
    if (!feature || typeof feature !== "object") {
      return true;
    }
    const geometry = (feature as Record<string, unknown>).geometry;
    if (!geometry || typeof geometry !== "object") {
      return true;
    }
    return (
      _geometryTypeToFamily(String((geometry as { type?: unknown }).type)) !==
      family
    );
  });
  if (hasWrongFamily) {
    throw new Error("A spatial feature does not match the configured family");
  }
  return parsed as GeoJSON.FeatureCollection;
}

/** Parses and validates the stable one-row spatial query result envelope. */
export function parseMapLayerSpatialResult(options: {
  queryResult: QueryResult.T<UnknownRow>;
  family: MapLayer.GeometryFamily;
}): ParsedMapLayerSpatialResult {
  const { queryResult, family } = options;
  const row = queryResult.data[0];
  if (!row) {
    throw new Error("The spatial query did not return its result envelope");
  }
  const diagnostics = _parseDiagnostics(
    row[MapLayerSpatialQueryColumns.diagnostics],
  );
  if (diagnostics.hasMixedFamilies) {
    throw new Error("The source contains mixed geometry families");
  }
  return {
    featureCollection: _parseFeatureCollection(
      row[MapLayerSpatialQueryColumns.featureCollection],
      family,
    ),
    diagnostics,
  };
}
