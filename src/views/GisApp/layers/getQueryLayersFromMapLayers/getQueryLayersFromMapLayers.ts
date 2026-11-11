import { prop } from "@avandar/utils";
import { getBufferLabelColumnsFromMapLayer } from "@/views/GisApp/layers/getBufferLabelColumnsFromMapLayer/getBufferLabelColumnsFromMapLayer";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * True when "all fields" in the layer's popup should fetch every source
 * column: an exact layer that draws one feature per row from an
 * unaggregated query. A displaced layer never qualifies, since its exact
 * coordinates or addresses would then show in its popup.
 */
function _shouldQueryAllSourceColumns(layer: MapLayer.T): boolean {
  const bindingType = layer.geoBinding?.type;
  return (
    layer.popup.columnIds === "all" &&
    layer.sensitivity.mode === "exact" &&
    (bindingType === "geometryColumn" || bindingType === "latLngColumns") &&
    Object.keys(layer.source.aggregations).length === 0
  );
}

/** `layer` with every source column added to its query, when it qualifies. */
function _withPopupAllColumnsQueried(layer: MapLayer.T): MapLayer.T {
  if (!_shouldQueryAllSourceColumns(layer)) {
    return layer;
  }
  const queriedBaseIds = new Set(
    layer.source.queryColumns.map((column) => {
      return column.baseColumn.id;
    }),
  );
  const missingColumns = (layer.source.sourceColumns ?? []).filter((column) => {
    return !queriedBaseIds.has(column.baseColumn.id);
  });
  if (missingColumns.length === 0) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [...layer.source.queryColumns, ...missingColumns],
    },
  };
}

/**
 * The ring label column ids each exact source layer must query: those of
 * the undissolved buffers drawn around it. A displaced source is left out,
 * since buffers of displaced points are refused.
 */
function _getRingLabelColumnIdsBySourceId(
  layers: readonly MapLayer.T[],
): Map<MapLayer.Id, QueryColumn.Id[]> {
  const labelIdsBySourceId = new Map<MapLayer.Id, QueryColumn.Id[]>();
  layers.forEach((layer) => {
    const binding = layer.geoBinding;
    if (
      binding?.type === "bufferOfLayer" &&
      binding.labelColumn &&
      !binding.dissolve
    ) {
      labelIdsBySourceId.set(binding.layerId, [
        ...(labelIdsBySourceId.get(binding.layerId) ?? []),
        binding.labelColumn,
      ]);
    }
  });
  return labelIdsBySourceId;
}

/** `layer` with its rings' label columns added to its query when missing. */
function _withRingLabelColumnsQueried(
  layer: MapLayer.T,
  labelColumnIds: readonly QueryColumn.Id[],
): MapLayer.T {
  if (layer.sensitivity.mode !== "exact") {
    return layer;
  }
  const queriedIds = new Set(layer.source.queryColumns.map(prop("id")));
  const missingColumns = getBufferLabelColumnsFromMapLayer(layer).filter(
    (column) => {
      return labelColumnIds.includes(column.id) && !queriedIds.has(column.id);
    },
  );
  if (missingColumns.length === 0) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [...layer.source.queryColumns, ...missingColumns],
    },
  };
}

/**
 * The layers as their data queries run them. A popup set to all fields
 * would otherwise fetch only the columns the binding selected (for a
 * geometry column layer, just the geometry), leaving the popup and the
 * feature list empty, so an exact row layer also queries every hydrated
 * source column. An exact layer that rings are drawn around also queries
 * the rings' label column, so each ring and the feature list's nearest site
 * can show it whatever the layer's popup lists. The added columns keep their
 * source ids, so query keys stay stable.
 *
 * This is for running queries only. Never save its result: the saved map
 * keeps the columns its author chose, so a layer later set to Displace
 * stops querying the extra columns at once. Used by `useMapLayerRendering`,
 * `useFeatureListQuery`, `loadExportFeatureTable`, and the export sheet's
 * `ExportFeatureListConfig`, which saves only column ids.
 */
export function getQueryLayersFromMapLayers(
  layers: readonly MapLayer.T[],
): MapLayer.T[] {
  const labelIdsBySourceId = _getRingLabelColumnIdsBySourceId(layers);
  return layers.map((layer) => {
    const widenedLayer = _withPopupAllColumnsQueried(layer);
    const labelColumnIds = labelIdsBySourceId.get(layer.id);
    return labelColumnIds
      ? _withRingLabelColumnsQueried(widenedLayer, labelColumnIds)
      : widenedLayer;
  });
}
