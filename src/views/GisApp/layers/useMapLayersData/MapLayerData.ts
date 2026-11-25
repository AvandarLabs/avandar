import { isDefined, propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";

/** True when the layer's query returns every column a point binding names. */
function _isPointBindingComplete(
  layer: MapLayer.T,
  points: MapLayer.PointBinding,
): boolean {
  const hasColumn = (columnId: QueryColumn.Id | undefined): boolean => {
    return (
      columnId !== undefined &&
      layer.source.queryColumns.some(propEq("id", columnId))
    );
  };
  return points.type === "geometryColumn"
    ? hasColumn(points.column)
    : hasColumn(points.latitude) && hasColumn(points.longitude);
}

function _getBufferSourceQueryKey(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): unknown {
  if (layer.geoBinding?.type !== "bufferOfLayer") {
    return undefined;
  }
  const sourceId = layer.geoBinding.layerId;
  const source = stack.find(propEq("id", sourceId));
  if (!source) {
    return undefined;
  }
  return {
    id: source.id,
    source: source.source,
    geoBinding: source.geoBinding,
    sensitivity: source.sensitivity,
    timeColumn: source.timeColumn,
    applyAoiFilter: source.applyAoiFilter,
  };
}

/** Layers a layer's query reads: its buffer source and its filter layer. */
function _getDependencyLayers(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): MapLayer.T[] {
  const dependencyIds = [
    ...(layer.geoBinding?.type === "bufferOfLayer"
      ? [layer.geoBinding.layerId]
      : []),
    ...(layer.spatialFilter ? [layer.spatialFilter.layerId] : []),
  ];
  return dependencyIds
    .map((dependencyId) => {
      return stack.find(propEq("id", dependencyId));
    })
    .filter(isDefined);
}

/**
 * Cache key parts of every layer a filtered layer's compiled SQL reads
 * through its spatial filter: the filter layer, then each buffer source and
 * filter layer reached from it, in walk order. `undefined` for a layer with
 * no spatial filter, so unfiltered keys do not change.
 */
function _getSpatialFilterDependencyKey(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): unknown[] | undefined {
  if (!layer.spatialFilter) {
    return undefined;
  }
  const visitedIds = new Set<MapLayer.Id>([layer.id]);
  const dependencyKeys: unknown[] = [];
  const pendingLayers = [
    stack.find(propEq("id", layer.spatialFilter.layerId)),
  ].filter(isDefined);
  for (
    let current = pendingLayers.shift();
    current !== undefined;
    current = pendingLayers.shift()
  ) {
    if (!visitedIds.has(current.id)) {
      visitedIds.add(current.id);
      dependencyKeys.push({
        id: current.id,
        source: current.source,
        geoBinding: current.geoBinding,
        sensitivity: current.sensitivity,
        timeColumn: current.timeColumn,
        applyAoiFilter: current.applyAoiFilter,
        spatialFilter: current.spatialFilter,
      });
      pendingLayers.push(..._getDependencyLayers(current, stack));
    }
  }
  return dependencyKeys;
}

/** True when `layer`'s own binding and source can compile. */
function _isOwnBindingQueryable(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): boolean {
  if (layer.geoBinding?.type === "bufferOfLayer") {
    const sourceId = layer.geoBinding.layerId;
    return stack.some(propEq("id", sourceId));
  }
  if (layer.source.dataSource === undefined) {
    return false;
  }
  const binding = layer.geoBinding;
  if (binding?.type === "geometryColumn") {
    return layer.source.queryColumns.some(propEq("id", binding.column));
  }
  if (binding?.type === "binPointsToGrid") {
    return _isPointBindingComplete(layer, binding.points);
  }
  if (
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries"
  ) {
    return true;
  }
  return MapLayer.toGeoBinding(layer) !== undefined;
}

/**
 * True when every layer along `layer`'s spatial filter chain can compile.
 * A missing filter layer or a cycle returns true, so the compiler can
 * report it.
 */
function _isSpatialFilterChainQueryable(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): boolean {
  const visitedIds = new Set<MapLayer.Id>([layer.id]);
  let filterLayer = layer.spatialFilter
    ? stack.find(propEq("id", layer.spatialFilter.layerId))
    : undefined;
  while (filterLayer && !visitedIds.has(filterLayer.id)) {
    if (!_isOwnBindingQueryable(filterLayer, stack)) {
      return false;
    }
    visitedIds.add(filterLayer.id);
    const nextFilterId = filterLayer.spatialFilter?.layerId;
    filterLayer = nextFilterId
      ? stack.find(propEq("id", nextFilterId))
      : undefined;
  }
  return true;
}

function _hasColumnIdFilterTargets(
  filters: StructuredQuery.FilterGroup,
): boolean {
  return filters.rules.every((node) => {
    return match(node)
      .with({ type: "group" }, _hasColumnIdFilterTargets)
      .with({ type: "rule" }, (rule) => {
        return typeof rule.columnId === "string";
      })
      .exhaustive();
  });
}

function _hasReadySourceFilters(layer: MapLayer.T): boolean {
  const { filters, having, sourceColumns } = layer.source;
  return (
    (filters.rules.length === 0 && having.rules.length === 0) ||
    (sourceColumns !== undefined &&
      _hasColumnIdFilterTargets(filters) &&
      _hasColumnIdFilterTargets(having))
  );
}

/** Queryability and cache-key helpers for map-layer data. */
export const MapLayerData = {
  /**
   * True when the filters and having clauses of this layer, of each layer it
   * buffers, and of each layer it is spatially filtered by are hydrated, with
   * every rule targeting a column ID. Check it before running a layer's SQL,
   * for example to hold a layer's data query or the time slider's extent
   * until saved filters can apply. Missing layers and cycles return true, so
   * the compiler can report them.
   */
  hasReadySourceFilters: ({
    layer,
    stack,
  }: Readonly<{
    layer: MapLayer.T;
    stack: readonly MapLayer.T[];
  }>): boolean => {
    const visitedIds = new Set<MapLayer.Id>();
    const pendingLayers: MapLayer.T[] = [layer];
    for (
      let current = pendingLayers.pop();
      current !== undefined;
      current = pendingLayers.pop()
    ) {
      if (!visitedIds.has(current.id)) {
        if (!_hasReadySourceFilters(current)) {
          return false;
        }
        visitedIds.add(current.id);
        pendingLayers.push(..._getDependencyLayers(current, stack));
      }
    }
    return true;
  },

  /**
   * True when the layer can compile: a resolvable binding, or a buffer whose
   * source is on the stack, and, when it is spatially filtered, every layer
   * along its filter chain can compile too. A filtered layer waits rather
   * than errors while its filter layer is still being configured.
   */
  isQueryable: (
    layer: MapLayer.T,
    stack: readonly MapLayer.T[] = [],
  ): boolean => {
    return (
      _isOwnBindingQueryable(layer, stack) &&
      _isSpatialFilterChainQueryable(layer, stack)
    );
  },

  /**
   * Cache key for a layer's rows, excluding display-only layer settings.
   *
   * `pointContext` carries the zoom for a lat/lng point layer, which belongs
   * in the key because a large point layer is aggregated into a zoom-sized
   * grid in SQL: without it, zooming in would keep redrawing the grid built
   * for the zoom the layer first loaded at.
   */
  getQueryKeyFromMapLayer: (
    layer: MapLayer.T,
    spatialContext?: {
      availability: DuckDbSpatialAvailability;
      zoomBand: number;
      simplificationReferenceLatitude: number;
    },
    overlay?: MapOverlay,
    stack: readonly MapLayer.T[] = [],
    pointContext?: { zoomBand: number },
  ): unknown[] => {
    const sourceKey = _getBufferSourceQueryKey(layer, stack);
    const filterKey = _getSpatialFilterDependencyKey(layer, stack);
    return [
      "mapLayerData",
      layer.id,
      layer.source,
      layer.geoBinding,
      layer.sensitivity,
      layer.timeColumn,
      layer.applyAoiFilter,
      layer.spatialFilter,
      layer.disputedStatusColumn,
      layer.disputedStatusValues,
      overlay?.timeRange,
      overlay?.aoi,
      ...(spatialContext ? [spatialContext] : []),
      ...(pointContext ? [pointContext] : []),
      ...(sourceKey ? [sourceKey] : []),
      ...(filterKey ? [filterKey] : []),
    ];
  },
};
