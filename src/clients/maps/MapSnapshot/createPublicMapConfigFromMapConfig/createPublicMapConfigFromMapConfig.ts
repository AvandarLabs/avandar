import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * Cuts a query column to what a public page resolves through it: its id and
 * the result column name its features are keyed by, pinned as `outputAlias`
 * so every name lookup returns it unchanged.
 */
function _createPublicQueryColumn(column: QueryColumn.T): QueryColumn.T {
  const derivedName = QueryColumn.getDerivedColumnName(column);
  return {
    __type: "QueryColumn",
    id: column.id,
    aggregation: column.aggregation,
    outputAlias: derivedName,
    // The base column's ids, original name, and description only tell a
    // reader which dataset and workspace the data came from. A public page
    // reads a column's name through `outputAlias` and nothing else but its
    // data type, so the cast states that the rest is left out on purpose.
    baseColumn: {
      __type: "DatasetColumn",
      name: derivedName,
      dataType: column.baseColumn.dataType,
    } as QueryColumn.T["baseColumn"],
  };
}

/**
 * Keeps a displaced layer's mode but not its radius. The points are already
 * displaced, so the page never reads it, and the radius would tell a reader
 * how far each published point can be from the exact one.
 */
function _createPublicLayer(layer: MapLayer.T): MapLayer.T {
  const withoutSource = {
    ...layer,
    source: {
      ...StructuredQuery.makeEmpty(),
      queryColumns: layer.source.queryColumns.map(_createPublicQueryColumn),
    },
  };
  return layer.sensitivity.mode === "jitter"
    ? {
        ...withoutSource,
        sensitivity: { mode: "jitter", radiusMeters: 0 },
      }
    : withoutSource;
}

/**
 * Builds the config a public map page is drawn from. It keeps only the layers
 * that were published, and each keeps its styling, binding, legend, and the
 * query column names the renderer resolves paint and popup columns through.
 * Each loses its data source, filters, joins, dataset column metadata, and
 * displacement radius, none of which the page has any reason to see.
 *
 * @param params The map config and the layers that were published.
 * @param params.config The map's config, with legends already baked in.
 * @param params.publishedLayerIds The ids of the layers the snapshot holds.
 * Every other layer, hidden or skipped, is left out.
 * @returns The public config.
 */
export function createPublicMapConfigFromMapConfig({
  config,
  publishedLayerIds,
}: Readonly<{
  config: AvaMapConfig.T;
  publishedLayerIds: ReadonlySet<MapLayer.Id>;
}>): AvaMapConfig.T {
  return {
    ...config,
    layers: config.layers
      .filter((layer) => {
        return publishedLayerIds.has(layer.id);
      })
      .map(_createPublicLayer),
  };
}
