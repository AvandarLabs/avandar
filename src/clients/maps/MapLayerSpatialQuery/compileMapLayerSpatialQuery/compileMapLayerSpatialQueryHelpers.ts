import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { getSimplificationToleranceFromZoomBand } from "../getSimplificationToleranceFromZoomBand/getSimplificationToleranceFromZoomBand";
import { makeGeometryExpressionFromValueExpression } from "../makeGeometryExpressionFromValueExpression/makeGeometryExpressionFromValueExpression";
import { makeSourceCrsTransformFromGeometrySql } from "../makeSourceCrsTransformFromGeometrySql/makeSourceCrsTransformFromGeometrySql";
import { MapLayerSpatialFeatureProperties } from "../MapLayerSpatialQuery.constants";
import type {
  MapLayerSpatialQueryPlan,
  ResolvedMapLayerMetadata,
} from "../MapLayerSpatialQuery.types";
import type { CompileOptions } from "./compileMapLayerSpatialQuery.types";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * Shared SQL fragment builders used by every spatial-layer compiler.
 */

/** Overlay AOI when the layer participates in area filtering. */
export function getAppliedAoiFromCompileOptions(
  options: Readonly<{
    layer: MapLayer.T;
    overlay: CompileOptions["overlay"];
  }>,
): AvaMapConfig.AoiPolygon | undefined {
  if (!options.layer.applyAoiFilter || !options.overlay.aoi) {
    return undefined;
  }
  return options.overlay.aoi;
}

/** Applies topology-preserving Web Mercator simplification when configured. */
export function makeSimplifiedGeometrySql(
  options: Readonly<{
    geometrySql: string;
    simplification: MapLayer.GeometrySimplification | undefined;
    zoomBand: number;
    simplificationReferenceLatitude: number;
  }>,
): string {
  const { geometrySql, simplification } = options;
  if (!simplification || simplification.tolerancePixels <= 0) {
    return geometrySql;
  }
  const tolerance = getSimplificationToleranceFromZoomBand({
    zoomBand: options.zoomBand,
    centerLatitude: options.simplificationReferenceLatitude,
    tolerancePixels: simplification.tolerancePixels,
  });
  const projected = `ST_Transform(${geometrySql}, 'EPSG:4326', 'EPSG:3857', always_xy := true)`;
  return `ST_Transform(ST_SimplifyPreserveTopology(${projected}, ${tolerance}), 'EPSG:3857', 'EPSG:4326', always_xy := true)`;
}

/** Maps DuckDB single and multi geometry types to renderable families. */
export function makeFamilyExpressionFromGeometrySql(
  geometrySql: string,
): string {
  const normalizedType = `upper(replace(CAST(ST_GeometryType(${geometrySql}) AS VARCHAR), 'ST_', ''))`;
  return `CASE WHEN ${normalizedType} IN ('POINT', 'MULTIPOINT') THEN 'point' WHEN ${normalizedType} IN ('LINESTRING', 'MULTILINESTRING') THEN 'line' WHEN ${normalizedType} IN ('POLYGON', 'MULTIPOLYGON') THEN 'polygon' ELSE NULL END`;
}

/** Builds point geometry from coordinate or encoded-geometry input. */
export function makePointExpressionFromBinding(
  options: Readonly<{
    points: MapLayer.PointBinding;
    metadata: ResolvedMapLayerMetadata;
  }>,
): string {
  const { points, metadata } = options;
  if (points.type === "geometryColumn") {
    const name = metadata.sourceColumnNames.get(points.column);
    if (!name) {
      throw new Error("The point geometry column could not be resolved");
    }
    return makeSourceCrsTransformFromGeometrySql({
      geometrySql: makeGeometryExpressionFromValueExpression({
        valueExpression: quoteSqlIdentifier(name),
        encoding: points.encoding,
      }),
      sourceCrs: points.sourceCrs,
    });
  }
  const latitude =
    points.latitude ?
      metadata.sourceColumnNames.get(points.latitude)
    : undefined;
  const longitude =
    points.longitude ?
      metadata.sourceColumnNames.get(points.longitude)
    : undefined;
  if (!latitude || !longitude) {
    throw new Error("Both point coordinate columns are required");
  }
  return `TRY(ST_Point(${quoteSqlIdentifier(longitude)}, ${quoteSqlIdentifier(latitude)}))`;
}

/** Builds the selected point aggregation metric. */
export function makePointAggregateValueSql(
  options: Readonly<{
    aggregation: MapLayer.AreaAggregation;
    metadata: ResolvedMapLayerMetadata;
  }>,
): string {
  const { aggregation, metadata } = options;
  if (aggregation.operation === "count") {
    return "count(*)";
  }
  const measure = metadata.aggregationMeasureColumnName;
  if (!measure) {
    throw new Error("The point aggregation measure is unresolved");
  }
  return `${aggregation.operation}(${quoteSqlIdentifier(measure)})`;
}

/** Builds a GeoJSON feature whose properties hide values when suppressed. */
export function makeSuppressedAreaFeatureSql(options: {
  geometrySql: string;
  featureIdSql: string;
  nameSql: string;
  keySql?: string;
  denominatorSql: string;
  contributorCountSql: string;
}): string {
  const properties = MapLayerSpatialFeatureProperties;
  const keyPair =
    options.keySql === undefined ?
      ""
    : `, '${properties.boundaryKey}', ${options.keySql}`;
  return `json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(${options.geometrySql})),
    'properties', CASE WHEN state = 'suppressed' THEN json_object(
        '${properties.featureId}', ${options.featureIdSql}${keyPair},
        '${properties.boundaryName}', ${options.nameSql},
        '${properties.state}', state)
      ELSE json_object(
        '${properties.featureId}', ${options.featureIdSql}${keyPair},
        '${properties.boundaryName}', ${options.nameSql},
        '${properties.state}', state,
        '${properties.value}', reportable_value,
        '${properties.denominator}', ${options.denominatorSql},
        '${properties.contributorCount}', ${options.contributorCountSql})
      END)`;
}

/** Completes a compiled plan with the zoom inputs used to generate it. */
export function makeSpatialQueryPlan(
  options: Readonly<{
    compile: CompileOptions;
    rawSql: string;
    family: MapLayerSpatialQueryPlan["family"];
    sourcePropertyColumnNames: string[];
  }>,
): MapLayerSpatialQueryPlan {
  return {
    rawSql: options.rawSql,
    family: options.family,
    sourcePropertyColumnNames: options.sourcePropertyColumnNames,
    zoomBand: options.compile.zoomBand,
    simplificationReferenceLatitude:
      options.compile.simplificationReferenceLatitude,
  };
}
