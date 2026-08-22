import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getClusterTableColumnsFromLeaves } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumnsFromLeaves/getClusterTableColumnsFromLeaves";
import type { ClusterTableColumns } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumnsFromLeaves/getClusterTableColumnsFromLeaves";

/**
 * Names every column the layer's popup would show. Unlike
 * `MapLayer.toPopupColumnNames`, `"all"` is resolved to the query's actual
 * column names rather than left as a sentinel, so the result is always a
 * concrete, page-independent list.
 */
function _getLayerColumnNames(layer: MapLayer.T): readonly string[] {
  const columnNames = MapLayer.toPopupColumnNames(layer);
  if (columnNames !== "all") {
    return columnNames;
  }
  return layer.source.queryColumns.map(QueryColumn.getDerivedColumnName);
}

/**
 * Derives the cluster table's columns from the layer's popup configuration,
 * so the table and the single-feature view agree on the same fields and the
 * header stays identical across every page.
 *
 * Falls back to the union of properties actually present on the current
 * page's leaves when no layer is known, and beneath that to a single `id`
 * column (see {@link getClusterTableColumnsFromLeaves}) when the layer's
 * popup shows no fields at all.
 */
export function getClusterTableColumns(
  options: Readonly<{
    layer: MapLayer.T | undefined;
    leaves: readonly GeoJSON.Feature[];
  }>,
): ClusterTableColumns {
  const { layer, leaves } = options;
  if (layer) {
    const columnNames = _getLayerColumnNames(layer);
    if (columnNames.length > 0) {
      return { source: "properties", keys: columnNames };
    }
  }
  return getClusterTableColumnsFromLeaves(leaves);
}
