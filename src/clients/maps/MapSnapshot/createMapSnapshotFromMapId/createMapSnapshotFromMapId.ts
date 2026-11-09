import { prop, where } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { compileMapSnapshot } from "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot";
import { MapSnapshotPublishError } from "@/clients/maps/MapSnapshot/MapSnapshotPublishError";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { isSpatialMapLayerBinding } from "@/views/GisApp/layers/useMapLayersData/runMapLayerQuery";
import { MapSourceHydration } from "@/views/GisApp/useGisApp/MapSourceHydration/MapSourceHydration";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapSnapshotQueryContext } from "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

type MapQueryInputs = {
  config: AvaMapConfig.T;
  datasets: Dataset.T[];
  datasetColumns: DatasetColumn.T[];
  placesDatasetIds: ReadonlySet<Dataset.Id>;
};

async function _getPlacesDatasetIds(
  workspaceId: Workspace.Id,
): Promise<ReadonlySet<Dataset.Id>> {
  const virtualDatasets = await VirtualDatasetClient.getAll({
    where: { workspace_id: { eq: workspaceId }, is_places: { eq: true } },
  });
  return new Set(virtualDatasets.map(prop("datasetId")));
}

type HydrationMetadata = Readonly<{
  datasetColumns: readonly DatasetColumn.T[];
  conceptAttributes: readonly ConceptAttribute.T[];
}>;

/**
 * The layers whose saved filters lost a rule to hydration because it names
 * a column their data no longer has. Hidden layers count too: a hidden
 * layer can still narrow another layer as its spatial filter.
 */
function _getLayerNamesWithDroppedFilters(
  options: Readonly<{ config: AvaMapConfig.T; metadata: HydrationMetadata }>,
): string[] {
  return options.config.layers
    .filter((layer) => {
      const { issues } = MapSourceHydration.fromMetadata({
        ...options.metadata,
        config: { ...options.config, layers: [layer] },
      });
      return issues.length > 0;
    })
    .map(prop("name"));
}

/**
 * Hydrates the saved config the way the GIS app does before it queries.
 * Hydration only ever drops filter rules, so any issue means the map would
 * publish less restricted than it is saved, and the publish stops instead.
 */
function _hydrateMapConfig(
  options: Readonly<{ avaMap: AvaMap.T; metadata: HydrationMetadata }>,
): AvaMapConfig.T {
  const { avaMap, metadata } = options;
  const { config, issues } = MapSourceHydration.fromMetadata({
    ...metadata,
    config: avaMap.config,
  });
  if (issues.length > 0) {
    throw new MapSnapshotPublishError({
      reason: "filtersNoLongerApply",
      mapId: avaMap.id,
      mapName: avaMap.name,
      layerNames: _getLayerNamesWithDroppedFilters({
        config: avaMap.config,
        metadata,
      }),
    });
  }
  return config;
}

/**
 * Reads the workspace metadata a map's queries need and hydrates the saved
 * config from it. The config is not given places' `place_id` column: that
 * column exists only for editing places in the GIS app and never goes
 * public.
 */
async function _loadMapQueryInputs(avaMap: AvaMap.T): Promise<MapQueryInputs> {
  const inWorkspace = where("workspace_id", "eq", avaMap.workspaceId);
  const [datasets, datasetColumns, conceptAttributes, placesDatasetIds] =
    await Promise.all([
      DatasetClient.getAll(inWorkspace),
      DatasetColumnClient.getAll(inWorkspace),
      ConceptAttributeClient.getAll(inWorkspace),
      _getPlacesDatasetIds(avaMap.workspaceId),
    ]);
  const config = _hydrateMapConfig({
    avaMap,
    metadata: { datasetColumns, conceptAttributes },
  });
  return { config, datasets, datasetColumns, placesDatasetIds };
}

/** True when a visible layer's query uses DuckDB Spatial functions. */
function _layerNeedsSpatial(
  layer: MapLayer.T,
  config: Readonly<AvaMapConfig.T>,
): boolean {
  if (!layer.isVisible) {
    return false;
  }
  if (isSpatialMapLayerBinding(layer) || layer.spatialFilter !== undefined) {
    return true;
  }
  return (
    layer.geoBinding?.type === "latLngColumns" &&
    layer.applyAoiFilter &&
    config.aoi !== undefined
  );
}

async function _assertSpatialAvailable(
  config: Readonly<AvaMapConfig.T>,
): Promise<void> {
  const needsSpatial = config.layers.some((layer) => {
    return _layerNeedsSpatial(layer, config);
  });
  if (needsSpatial && !(await DuckDbClient.ensureSpatial())) {
    throw new Error(
      "Cannot publish: this map needs DuckDB Spatial, which this browser could not load.",
    );
  }
}

/**
 * Reads the map's secret displacement salt. Only a map editor can read it, and
 * a snapshot compiled without it would publish exact locations, so a
 * non-editor's publish stops here.
 */
async function _getJitterSaltForPublish(avaMap: AvaMap.T): Promise<string> {
  const jitterSalt = await AvaMapClient.getJitterSalt({ mapId: avaMap.id });
  if (jitterSalt === undefined) {
    throw new MapSnapshotPublishError({
      reason: "cannotEditMap",
      mapId: avaMap.id,
      mapName: avaMap.name,
      layerNames: [],
    });
  }
  return jitterSalt;
}

/**
 * The query context the GIS app builds for a map at its saved view: the zoom
 * band and simplification latitude come from the saved camera, and jittered
 * points are keyed by the map's own salt.
 */
function _createQueryContext(
  options: Readonly<{
    avaMap: AvaMap.T;
    inputs: MapQueryInputs;
    jitterSalt: string;
  }>,
): MapSnapshotQueryContext {
  const { config, datasets, datasetColumns } = options.inputs;
  return {
    workspaceId: options.avaMap.workspaceId,
    zoomBand: Math.max(0, Math.min(24, Math.floor(config.view.zoom))),
    simplificationReferenceLatitude: config.view.center[1],
    datasets,
    datasetColumns,
    jitterSalt: options.jitterSalt,
  };
}

/**
 * Loads a map the publisher can read, hydrates its saved config like the GIS
 * app does, and compiles it at its saved view. Throws when the map is
 * missing, outside the dashboard's workspace, or cannot be queried, so a
 * publish never goes out with a map silently left behind.
 *
 * @throws MapSnapshotPublishError when a saved filter no longer matches the
 * map's data, so the snapshot would show rows the author filtered out, or
 * when the publisher cannot edit the map and so cannot read its salt.
 */
export async function createMapSnapshotFromMapId(
  options: Readonly<{ mapId: AvaMap.Id; workspaceId: Workspace.Id }>,
): Promise<MapSnapshot> {
  const avaMap = await AvaMapClient.getById({ id: options.mapId });
  if (!avaMap || avaMap.workspaceId !== options.workspaceId) {
    throw new Error(
      `Cannot publish: map ${options.mapId} is unavailable or outside this workspace.`,
    );
  }
  const jitterSalt = await _getJitterSaltForPublish(avaMap);
  const inputs = await _loadMapQueryInputs(avaMap);
  await _assertSpatialAvailable(inputs.config);
  return await compileMapSnapshot({
    mapId: avaMap.id,
    mapName: avaMap.name,
    mapConfig: inputs.config,
    queryContext: _createQueryContext({ avaMap, inputs, jitterSalt }),
    placesDatasetIds: inputs.placesDatasetIds,
  });
}
