import { propEq } from "@avandar/utils";
import { makeFeaturesCteSqlFromFeatureSource } from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { compileMapLayerFeatureSource } from "../compileMapLayerFeatureSource/compileMapLayerFeatureSource";
import { getFeatureListAccessFromMapLayer } from "../getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import type { FetchMapLayerFeatureCountOptions } from "../MapLayerFeatureList.types";

/**
 * How many of one layer's features pass the map's AOI, time, and spatial
 * filters, without reading any row. Use it where rows may not be shown but a
 * count may, for example a feature list for a layer with approximate
 * locations.
 * @throws When the layer is missing or has no feature list at all.
 */
export async function fetchMapLayerFeatureCount(
  options: Readonly<FetchMapLayerFeatureCountOptions>,
): Promise<number> {
  const layer = options.config.layers.find(propEq("id", options.layerId));
  if (!layer || getFeatureListAccessFromMapLayer(layer) === "unavailable") {
    throw new Error("This layer has no feature count");
  }
  const featureSource = compileMapLayerFeatureSource({
    config: options.config,
    layer,
    propertyColumnIds: [],
    datasets: options.datasets,
    datasetColumns: options.datasetColumns,
  });
  const result = await WorkspaceQuerySession.runQuery<{
    feature_count: unknown;
  }>({
    rawSql: `WITH ${makeFeaturesCteSqlFromFeatureSource({ cteName: "list_features", source: featureSource })}
SELECT count(*) AS feature_count FROM list_features WHERE geom IS NOT NULL`,
    workspaceId: options.workspaceId,
    signal: options.signal,
  });
  return Number(result.data[0]?.feature_count ?? 0);
}
