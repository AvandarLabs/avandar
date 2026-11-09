import { makeIdLookupMap } from "@avandar/utils";
import { getResolvedMapLayerMetadata } from "../getResolvedMapLayerMetadata/getResolvedMapLayerMetadata";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ResolvedMapLayerMetadata } from "../MapLayerSpatialQuery.types";

/**
 * Walks bufferOfLayer links to the layer whose columns a compile reads, or
 * `layer` itself when it buffers nothing. Use it wherever a policy depends on
 * the layer a buffer is ultimately drawn around, such as jitter displacement.
 * A missing source or a cycle stops the walk at the last layer reached.
 */
export function getLeafSourceLayerFromMapLayer(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): MapLayer.T {
  const byId = makeIdLookupMap(stack);
  const seen = new Set<MapLayer.Id>();
  let current = layer;
  while (current.geoBinding?.type === "bufferOfLayer") {
    if (seen.has(current.id)) {
      return current;
    }
    seen.add(current.id);
    const source = byId.get(current.geoBinding.layerId);
    if (!source) {
      return current;
    }
    current = source;
  }
  return current;
}

/**
 * The column names a spatial compile of `layer` reads, resolved against the
 * workspace's datasets. A buffer resolves against the layer it buffers. Use
 * it wherever a layer is compiled, for example to draw it, to filter
 * another layer by it, or to list its features.
 * @throws When a saved reference must be rebound before the layer can run.
 */
export function getCompileMetadataFromMapLayer(
  options: Readonly<{
    layer: MapLayer.T;
    stack: readonly MapLayer.T[];
    datasets: readonly Dataset.T[];
    datasetColumns: readonly DatasetColumn.T[];
  }>,
): ResolvedMapLayerMetadata {
  const metadata = getResolvedMapLayerMetadata({
    layer: getLeafSourceLayerFromMapLayer(options.layer, options.stack),
    datasets: options.datasets,
    datasetColumns: options.datasetColumns,
  });
  if (metadata.type === "rebindRequired") {
    throw new Error(`Map geometry requires rebinding: ${metadata.reason}`);
  }
  return metadata;
}
