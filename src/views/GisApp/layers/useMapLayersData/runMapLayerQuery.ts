import { compileSpatialFilteredQuery } from "@/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery/compileSpatialFilteredQuery";
import {
  getCompileMetadataFromMapLayer,
  getLeafSourceLayerFromMapLayer,
} from "@/clients/maps/MapLayerSpatialQuery/getCompileMetadataFromMapLayer/getCompileMetadataFromMapLayer";
import { parseMapLayerSpatialResult } from "@/clients/maps/MapLayerSpatialQuery/parseMapLayerSpatialResult/parseMapLayerSpatialResult";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { displaceSpatialFeatures } from "@/views/GisApp/layers/displaceSpatialFeatures/displaceSpatialFeatures";
import { runLatLngLayer } from "./runLatLngLayer";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  MapOverlay,
  SpatialFilterCompileOptions,
} from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";

/** Everything a layer query reads besides the layer itself. */
export type MapLayerQueryContext = {
  /**
   * The whole layer stack the queries run against: buffer layers resolve
   * their source from it and spatial filters resolve their filter layer
   * from it. Pass the stack from `getQueryLayersFromMapLayers` so a layer
   * whose popup lists every column queries every column.
   */
  stack: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  overlay: MapOverlay;
};

type RunMapLayerQueryOptions = Readonly<{
  layer: MapLayer.T;
  context: MapLayerQueryContext;
  signal?: AbortSignal;
}>;

/** True when a layer's geometry comes from DuckDB Spatial rather than rows. */
export function isSpatialMapLayerBinding(layer: MapLayer.T): boolean {
  return (
    layer.geoBinding !== undefined && layer.geoBinding.type !== "latLngColumns"
  );
}

/** Resolves any stacked layer's compile metadata from the loaded datasets. */
function _createMetadataResolver(
  context: MapLayerQueryContext,
): SpatialFilterCompileOptions["resolveMetadata"] {
  return (layer) => {
    return getCompileMetadataFromMapLayer({
      layer,
      stack: context.stack,
      datasets: context.datasets,
      datasetColumns: context.datasetColumns,
    });
  };
}

type LayerCompileOptions = SpatialFilterCompileOptions & {
  workspaceId: Workspace.Id;
  signal: AbortSignal | undefined;
};

/** The flat options both the spatial and the lat/lng compilers read. */
function _createCompileOptions(
  options: RunMapLayerQueryOptions,
): LayerCompileOptions {
  const { layer, context, signal } = options;
  return {
    layer,
    workspaceId: context.workspaceId,
    zoomBand: context.zoomBand,
    simplificationReferenceLatitude: context.simplificationReferenceLatitude,
    overlay: context.overlay,
    stack: context.stack,
    resolveMetadata: _createMetadataResolver(context),
    signal,
  };
}

/**
 * Compiles, executes, and parses one spatial layer, keeping only the
 * features inside its spatial filter layer, then applies its sensitivity
 * policy so no consumer of the query data sees exact points.
 */
async function _runSpatialLayer(
  options: RunMapLayerQueryOptions,
): Promise<MapLayerDataResult> {
  const compileOptions = _createCompileOptions(options);
  const plan = compileSpatialFilteredQuery(compileOptions);
  const queryResult = await WorkspaceQuerySession.runQuery({
    rawSql: plan.rawSql,
    workspaceId: compileOptions.workspaceId,
    signal: compileOptions.signal,
  });
  const parsed = parseMapLayerSpatialResult({
    queryResult,
    family: plan.family,
  });
  return {
    type: "spatial",
    featureCollection: displaceSpatialFeatures({
      layer: options.layer,
      sourceLayer: getLeafSourceLayerFromMapLayer(
        options.layer,
        compileOptions.stack,
      ),
      featureCollection: parsed.featureCollection,
    }),
    diagnostics: parsed.diagnostics,
  };
}

/**
 * Runs one map layer's query exactly the way the map draws it: a spatial
 * binding through DuckDB Spatial (spatial filters applied, sensitive points
 * displaced), anything else through the lat/lng path. Used by
 * `useMapLayersData` and by anything that needs a layer's data outside
 * React, such as a publish-time map compiler.
 */
export async function runMapLayerQuery(
  options: RunMapLayerQueryOptions,
): Promise<MapLayerDataResult> {
  if (isSpatialMapLayerBinding(options.layer)) {
    return await _runSpatialLayer(options);
  }
  return await runLatLngLayer(_createCompileOptions(options));
}
