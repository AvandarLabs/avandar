import { compileLatLngLayerSourceSql } from "@/clients/maps/MapLayerSpatialQuery/compileLatLngLayerSourceSql/compileLatLngLayerSourceSql";
import {
  compileSpatialFilteredQuery,
  compileSpatialFilterEnvelopeSql,
} from "@/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery/compileSpatialFilteredQuery";
import { getCompileMetadataFromMapLayer } from "@/clients/maps/MapLayerSpatialQuery/getCompileMetadataFromMapLayer/getCompileMetadataFromMapLayer";
import { FEATURE_LIST_ZOOM_BAND } from "../MapLayerFeatureList.constants";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { SpatialFilterCompileOptions } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerFeatureSource } from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";

type CompileFeatureSourceOptions = {
  config: AvaMapConfig.T;
  layer: MapLayer.T;
  propertyColumnIds: readonly QueryColumn.Id[];
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
};

/** Compile inputs for `layer`, carrying the requested property columns. */
function _makeCompileOptions(
  options: Readonly<CompileFeatureSourceOptions>,
): SpatialFilterCompileOptions {
  const { config } = options;
  return {
    layer: {
      ...options.layer,
      popup: { ...options.layer.popup, columnIds: options.propertyColumnIds },
    },
    stack: config.layers,
    overlay: { aoi: config.aoi, timeRange: config.timeRange },
    zoomBand: FEATURE_LIST_ZOOM_BAND,
    simplificationReferenceLatitude: config.view.center[1],
    resolveMetadata: (layer) => {
      return getCompileMetadataFromMapLayer({
        layer,
        stack: config.layers,
        datasets: options.datasets,
        datasetColumns: options.datasetColumns,
      });
    },
  };
}

/**
 * One layer's features as a source another query reads, with every map
 * filter applied (time, area, and spatial filter) and the requested columns
 * among each feature's properties. It compiles exactly what the map draws,
 * so a list built on it matches the map. Use it to list a layer's features
 * or to measure distances to them.
 * @throws When the layer's coordinate columns are incomplete or its spatial
 * filter is invalid.
 */
export function compileMapLayerFeatureSource(
  options: Readonly<CompileFeatureSourceOptions>,
): MapLayerFeatureSource {
  const compileOptions = _makeCompileOptions(options);
  if (compileOptions.layer.geoBinding?.type !== "latLngColumns") {
    return {
      type: "envelope",
      sql: compileSpatialFilteredQuery(compileOptions).rawSql,
    };
  }
  const rows = compileLatLngLayerSourceSql({
    layer: compileOptions.layer,
    overlay: compileOptions.overlay,
    spatialFilterEnvelopeSql: compileSpatialFilterEnvelopeSql(compileOptions),
  });
  if (!rows) {
    throw new Error("The layer's coordinate columns are incomplete");
  }
  return rows;
}
