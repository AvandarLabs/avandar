import { propEq } from "@avandar/utils";
import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { makeSpatialFilteredEnvelopeSql } from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import type { SpatialFilterCompileOptions } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";

/**
 * Zoom band a filtering layer always compiles at. Polygon simplification
 * depends on zoom, so a fixed band keeps which features pass the filter
 * from changing as the map zooms.
 */
const SPATIAL_FILTER_ZOOM_BAND = 24;

/** The layer `options.layer` is filtered by, checked for every invariant. */
function _getSpatialFilterLayer(
  options: Readonly<SpatialFilterCompileOptions>,
): MapLayer.T | undefined {
  const spatialFilter = options.layer.spatialFilter;
  if (!spatialFilter) {
    return undefined;
  }
  const filterLayer = options.stack.find(propEq("id", spatialFilter.layerId));
  if (!filterLayer) {
    throw new Error("Spatial filter layer is missing");
  }
  if (!MapLayer.isAreaGeoBinding(filterLayer.geoBinding)) {
    throw new Error("Spatial filter layer must output polygons");
  }
  if (hasSpatialFilterCycle(options.stack, options.layer.id)) {
    throw new Error("Spatial filter chain contains a cycle");
  }
  return filterLayer;
}

/**
 * The one-row envelope SQL of the layer that `options.layer` is spatially
 * filtered by, or `undefined` when it has no spatial filter. Use it to
 * filter rows that never become an envelope, such as a latitude and
 * longitude layer's rows.
 * @throws When the filtering layer is missing, outputs no polygons, or
 * depends on the filtered layer.
 */
export function compileSpatialFilterEnvelopeSql(
  options: Readonly<SpatialFilterCompileOptions>,
): string | undefined {
  const filterLayer = _getSpatialFilterLayer(options);
  if (!filterLayer) {
    return undefined;
  }
  return compileSpatialFilteredQuery({
    ...options,
    layer: filterLayer,
    zoomBand: SPATIAL_FILTER_ZOOM_BAND,
  }).rawSql;
}

/**
 * Compiles a spatial-binding layer and, when it has a spatial filter, keeps
 * only the output features that intersect the filtering layer's features.
 * The filter wraps every compiler's output the same way, so geometry
 * columns, boundary joins, point aggregations, grid bins, and buffers all
 * honor it. Use it wherever a layer's features are queried.
 */
export function compileSpatialFilteredQuery(
  options: Readonly<SpatialFilterCompileOptions>,
): MapLayerSpatialQueryPlan {
  const plan = compileMapLayerSpatialQuery({
    ...options,
    metadata: options.resolveMetadata(options.layer),
  });
  const filterEnvelopeSql = compileSpatialFilterEnvelopeSql(options);
  if (filterEnvelopeSql === undefined) {
    return plan;
  }
  return {
    ...plan,
    rawSql: makeSpatialFilteredEnvelopeSql({
      envelopeSql: plan.rawSql,
      filterEnvelopeSql,
    }),
  };
}
