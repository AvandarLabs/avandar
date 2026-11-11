import { propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { compileLatLngOverlaySql } from "../compileLatLngOverlaySql/compileLatLngOverlaySql";
import type { MapOverlay } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerFeatureSource } from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";

/**
 * A latitude and longitude layer's rows, with the map clock, AOI, and
 * spatial filter applied, plus the names of its coordinate columns. Use it
 * to read such a layer's points from SQL, for example to draw them, to
 * buffer them, or to list them. `undefined` when the layer's source query or
 * coordinate columns are incomplete.
 */
export function compileLatLngLayerSourceSql(
  options: Readonly<{
    layer: MapLayer.T;
    overlay: MapOverlay;
    spatialFilterEnvelopeSql: string | undefined;
  }>,
): Extract<MapLayerFeatureSource, { type: "rows" }> | undefined {
  const { layer } = options;
  const coordinates = MapLayer.toGeoBinding(layer);
  const sourceSql = structuredQueryToSql(layer.source);
  if (!coordinates || !sourceSql) {
    return undefined;
  }
  const timeColumn = layer.timeColumn
    ? layer.source.queryColumns.find(propEq("id", layer.timeColumn))
    : undefined;
  return {
    type: "rows",
    sql: compileLatLngOverlaySql({
      sourceSql,
      layer,
      overlay: options.overlay,
      latitudeColumnName: coordinates.latitudeColumnName,
      longitudeColumnName: coordinates.longitudeColumnName,
      timeColumnName: timeColumn
        ? QueryColumn.getDerivedColumnName(timeColumn)
        : undefined,
      timeColumnDataType: timeColumn?.baseColumn.dataType,
      spatialFilterEnvelopeSql: options.spatialFilterEnvelopeSql,
    }),
    latitudeColumnName: coordinates.latitudeColumnName,
    longitudeColumnName: coordinates.longitudeColumnName,
  };
}
