import { prop, where } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { compileMapSnapshot } from "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { isSpatialMapLayerBinding } from "@/views/GisApp/layers/useMapLayersData/runMapLayerQuery";
import { MapSourceHydration } from "@/views/GisApp/useGisApp/MapSourceHydration/MapSourceHydration";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
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

/**
 * Reads the workspace metadata a map's queries need and hydrates the saved
 * config from it, the way the GIS app does before it queries. The config is
 * not given places' `place_id` column: that column exists only for editing
 * places in the GIS app and never goes public.
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
  const { config } = MapSourceHydration.fromMetadata({
    config: avaMap.config,
    datasetColumns,
    conceptAttributes,
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
 * The query context the GIS app builds for a map at its saved view: the zoom
 * band and simplification latitude come from the saved camera, and jittered
 * points are keyed by the map row's own salt.
 */
function _createQueryContext(
  options: Readonly<{ avaMap: AvaMap.T; inputs: MapQueryInputs }>,
): MapSnapshotQueryContext {
  const { config, datasets, datasetColumns } = options.inputs;
  return {
    workspaceId: options.avaMap.workspaceId,
    zoomBand: Math.max(0, Math.min(24, Math.floor(config.view.zoom))),
    simplificationReferenceLatitude: config.view.center[1],
    datasets,
    datasetColumns,
    jitterSalt: options.avaMap.jitterSalt,
  };
}

/**
 * Loads a map the publisher can read, hydrates its saved config like the GIS
 * app does, and compiles it at its saved view. Throws when the map is
 * missing, outside the dashboard's workspace, or cannot be queried, so a
 * publish never goes out with a map silently left behind.
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
  const inputs = await _loadMapQueryInputs(avaMap);
  await _assertSpatialAvailable(inputs.config);
  return await compileMapSnapshot({
    mapId: avaMap.id,
    mapName: avaMap.name,
    mapConfig: inputs.config,
    queryContext: _createQueryContext({ avaMap, inputs }),
    placesDatasetIds: inputs.placesDatasetIds,
  });
}
