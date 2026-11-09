import { noop, prop } from "@avandar/utils";
import { applySnapshotSensitivity } from "@/clients/maps/MapSnapshot/compileMapSnapshot/applySnapshotSensitivity";
import { cutSnapshotFeatureProperties } from "@/clients/maps/MapSnapshot/compileMapSnapshot/cutSnapshotFeatureProperties";
import { createPublicMapConfigFromMapConfig } from "@/clients/maps/MapSnapshot/createPublicMapConfigFromMapConfig/createPublicMapConfigFromMapConfig";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import { createMapOverlayFromMapConfig } from "@/views/GisApp/layers/createMapOverlayFromMapConfig";
import { getQueryLayersFromMapLayers } from "@/views/GisApp/layers/getQueryLayersFromMapLayers/getQueryLayersFromMapLayers";
import { PersistedLayerLegends } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import { makeLayerRender } from "@/views/GisApp/layers/useAvaMapRender/makeLayerRender";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import { runMapLayerQuery } from "@/views/GisApp/layers/useMapLayersData/runMapLayerQuery";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  MapSnapshot,
  MapSnapshotLayer,
} from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";
import type { LayerLegendUpdate } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import type { LayerRender } from "@/views/GisApp/layers/useAvaMapRender/makeLayerRender";
import type { MapLayerQueryContext } from "@/views/GisApp/layers/useMapLayersData/runMapLayerQuery";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

/**
 * Everything a layer query reads that the map config does not already say.
 * The layer stack and the overlay are derived from the config itself, so a
 * caller cannot publish layers queried without the map's area of interest,
 * time range, or spatial filters.
 */
export type MapSnapshotQueryContext = Omit<
  MapLayerQueryContext,
  "stack" | "overlay"
>;

type CompileMapSnapshotOptions = Readonly<{
  mapId: AvaMap.Id;
  mapName: string;
  mapConfig: AvaMapConfig.T;
  queryContext: MapSnapshotQueryContext;

  /** The workspace's places datasets, whose `place_id` never goes public. */
  placesDatasetIds: ReadonlySet<Dataset.Id>;
  signal?: AbortSignal;
}>;

type CompileLayerOptions = Readonly<{
  layer: MapLayer.T;
  context: MapLayerQueryContext;
  placesDatasetIds: ReadonlySet<Dataset.Id>;
  signal: AbortSignal | undefined;
}>;

type CompiledLayer = {
  snapshotLayer: MapSnapshotLayer;
  legendUpdate: LayerLegendUpdate | undefined;
};

function _makeReadyQueryState(data: MapLayerDataResult): MapLayerQueryState {
  return {
    data,
    isLoading: false,
    isRefreshing: false,
    error: undefined,
    refetch: noop,
  };
}

function _assertLayerRendered(
  options: Readonly<{ layer: MapLayer.T; render: LayerRender }>,
): void {
  if (options.render.viewState.status !== "error") {
    return;
  }
  throw (
    options.render.viewState.error ??
    new Error(
      `Cannot publish: map layer "${options.layer.name}" could not be drawn.`,
    )
  );
}

/** Queries, draws, protects, and cuts one layer the way the viewer sees it. */
async function _compileLayer(
  options: CompileLayerOptions,
): Promise<CompiledLayer> {
  const { layer, context } = options;
  const data = await runMapLayerQuery({
    layer,
    context,
    signal: options.signal,
  });
  const render = makeLayerRender({
    layer,
    layerQueryStates: new Map([[layer.id, _makeReadyQueryState(data)]]),
    geometryCache: createLayerGeometryCache(),
    jitterSalt: context.jitterSalt,
  });
  _assertLayerRendered({ layer, render });
  const protectedFeatures = applySnapshotSensitivity({
    layer,
    stack: context.stack,
    featureCollection: render.featureCollection,
  });
  return {
    snapshotLayer: {
      layerId: layer.id,
      featureCollection: cutSnapshotFeatureProperties({
        layer,
        featureCollection: protectedFeatures,
        placesDatasetIds: options.placesDatasetIds,
      }),
      aggregation: data.type === "rows" ? data.aggregation : undefined,
    },
    legendUpdate: render.legendUpdate,
  };
}

/**
 * The visible layers a viewer would draw. A layer that cannot compile (no
 * source or no binding yet) draws nothing on the live map either, so it is
 * left out. A layer whose saved filters are not hydrated would run without
 * them, so it stops the publish instead.
 */
function _getPublishableLayers(stack: readonly MapLayer.T[]): MapLayer.T[] {
  return stack.filter((layer) => {
    if (!layer.isVisible || !MapLayerData.isQueryable(layer, stack)) {
      return false;
    }
    if (!MapLayerData.hasReadySourceFilters({ layer, stack })) {
      throw new Error(
        `Cannot publish: map layer "${layer.name}" has filters that are not loaded.`,
      );
    }
    return true;
  });
}

async function _compileVisibleLayers(
  options: CompileMapSnapshotOptions,
): Promise<CompiledLayer[]> {
  const stack = getQueryLayersFromMapLayers(options.mapConfig.layers);
  const context: MapLayerQueryContext = {
    ...options.queryContext,
    stack,
    overlay: createMapOverlayFromMapConfig(options.mapConfig),
  };
  const compiledLayers: CompiledLayer[] = [];
  for (const layer of _getPublishableLayers(stack)) {
    // Layers compile one at a time so DuckDB holds one layer's rows at once.
    compiledLayers.push(
      await _compileLayer({
        layer,
        context,
        placesDatasetIds: options.placesDatasetIds,
        signal: options.signal,
      }),
    );
  }
  return compiledLayers;
}

/**
 * Compiles a map into what a public page may show. Every visible layer runs
 * through the query and render path the live map uses, against the whole
 * layer stack as its queries see it (so spatial filters, buffers, and a
 * popup set to all fields behave as they do live) and the map's saved area
 * of interest and time range. Its sensitivity policy is checked again, its
 * properties are cut to its popup, its legend is baked in, and the config
 * loses its source queries.
 *
 * Displaced points are keyed by `queryContext.jitterSalt`, the map's secret
 * salt. It is read but never written into the snapshot.
 *
 * @throws SensitivityViolationError when a layer would publish geometry its
 * policy forbids, or any error that kept a layer from drawing. Nothing is
 * published partially.
 */
export async function compileMapSnapshot(
  options: CompileMapSnapshotOptions,
): Promise<MapSnapshot> {
  const compiledLayers = await _compileVisibleLayers(options);
  const legendUpdates = new Map(
    compiledLayers.flatMap((compiled) => {
      return compiled.legendUpdate
        ? [[compiled.snapshotLayer.layerId, compiled.legendUpdate] as const]
        : [];
    }),
  );
  const configWithLegends = PersistedLayerLegends.withLegendUpdates({
    mapConfig: options.mapConfig,
    legendUpdates,
  });
  return {
    version: 1,
    mapId: options.mapId,
    mapName: options.mapName,
    config: createPublicMapConfigFromMapConfig(configWithLegends),
    layers: compiledLayers.map(prop("snapshotLayer")),
  };
}
