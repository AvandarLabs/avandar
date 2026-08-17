import { prop, propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

function _getQueryColumnFromLayer(options: {
  layer: MapLayer.T;
  columnId: QueryColumn.Id | undefined;
}): QueryColumn.T | undefined {
  const { layer, columnId } = options;
  return columnId ?
      layer.source.queryColumns.find(propEq("id", columnId))
    : undefined;
}

function _withDataSource(options: {
  layer: MapLayer.T;
  dataSource: QueryDataSource.T | undefined;
}): MapLayer.T {
  const { layer, dataSource } = options;
  return { ...layer, source: { ...layer.source, dataSource } };
}

function _withDefaultPopupColumns(options: {
  layer: MapLayer.T;
  availableColumns: readonly QueryColumn.T[];
}): MapLayer.T {
  const { layer, availableColumns } = options;
  return {
    ...layer,
    popup: { ...layer.popup, columnIds: availableColumns.map(prop("id")) },
  };
}

function _withGeoBindingAxis(options: {
  layer: MapLayer.T;
  axis: "latitude" | "longitude";
  column: QueryColumn.T | undefined;
}): MapLayer.T {
  const { layer, axis, column } = options;
  const binding =
    layer.geoBinding?.type === "latLngColumns" ? layer.geoBinding : undefined;
  const hasColumn =
    column !== undefined &&
    !layer.source.queryColumns.some(propEq("id", column.id));
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns:
        hasColumn && column ?
          [...layer.source.queryColumns, column]
        : layer.source.queryColumns,
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: axis === "latitude" ? column?.id : binding?.latitude,
      longitude: axis === "longitude" ? column?.id : binding?.longitude,
    },
  } as MapLayer.T;
}

function _withGeometryBindingType(options: {
  layer: MapLayer.T;
  type: "latLngColumns" | "geometryColumn";
  geometryColumn?: QueryColumn.T;
}): MapLayer.T {
  const { layer, type, geometryColumn } = options;
  if (type === "latLngColumns") {
    return {
      ...layer,
      geoBinding: { type, latitude: undefined, longitude: undefined },
    } as MapLayer.T;
  }
  return {
    ...layer,
    geoBinding: {
      type,
      column: geometryColumn!.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
    },
  } as MapLayer.T;
}

function _withGeometryColumn(options: {
  layer: MapLayer.T;
  column: QueryColumn.T;
}): MapLayer.T {
  const { layer, column } = options;
  return {
    ...layer,
    geoBinding: {
      ...(layer.geoBinding as Extract<
        MapLayer.GeoBinding,
        { type: "geometryColumn" }
      >),
      column: column.id,
    },
  } as MapLayer.T;
}

function _patchGeoBinding(
  layer: MapLayer.T,
  patch: Record<string, unknown>,
): MapLayer.T {
  return {
    ...layer,
    geoBinding: { ...layer.geoBinding, ...patch },
  } as MapLayer.T;
}

function _withBoundaryJoin(options: {
  layer: MapLayer.T;
  dataKeyColumn: QueryColumn.T;
  matching: "exact" | "normalizedName";
  boundary: MapLayer.BoundarySource;
}): MapLayer.T {
  const { layer, dataKeyColumn, matching, boundary } = options;
  return {
    ...layer,
    geoBinding: {
      type: "joinToBoundaries",
      matching,
      boundary,
      dataKeyColumn: dataKeyColumn.id,
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
}

function _withGridBin(layer: MapLayer.T): MapLayer.T {
  const points =
    layer.geoBinding?.type === "latLngColumns" ?
      layer.geoBinding
    : { type: "latLngColumns" as const, latitude: undefined, longitude: undefined };
  return {
    ...layer,
    geoBinding: {
      type: "binPointsToGrid",
      grid: "hex",
      sizeMeters: MapLayer.defaultGridSizeMeters,
      points,
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
}

function _patchGridBin(
  layer: MapLayer.T,
  patch: Partial<MapLayer.GridBinBinding>,
): MapLayer.T {
  return {
    ...layer,
    geoBinding: {
      ...(layer.geoBinding as MapLayer.GridBinBinding),
      ...patch,
    },
  } as MapLayer.T;
}

function _withGeometryEncoding(options: {
  layer: MapLayer.T;
  encoding: MapLayer.GeometryEncoding;
}): MapLayer.T {
  return _patchGeoBinding(options.layer, { encoding: options.encoding });
}

function _withGeometryFamily(options: {
  layer: MapLayer.T;
  family: MapLayer.GeometryFamily;
}): MapLayer.T {
  return _patchGeoBinding(options.layer, { family: options.family });
}

function _withGeometrySimplification(options: {
  layer: MapLayer.T;
  simplification: MapLayer.GeometrySimplification | undefined;
}): MapLayer.T {
  return _patchGeoBinding(options.layer, {
    simplification: options.simplification,
  });
}

function _withGridSizeMeters(options: {
  layer: MapLayer.T;
  sizeMeters: number;
}): MapLayer.T {
  return _patchGridBin(options.layer, {
    sizeMeters: Math.min(1_000_000, Math.max(100, options.sizeMeters)),
  });
}

function _withGridType(options: {
  layer: MapLayer.T;
  grid: MapLayer.GridBinBinding["grid"];
}): MapLayer.T {
  return _patchGridBin(options.layer, { grid: options.grid });
}

function _withAreaAggregation(options: { layer: MapLayer.T }): MapLayer.T {
  return options.layer;
}

/** MapLayerUpdates stand-in used by DataSection tests. */
export function createDataSectionMapLayerUpdatesMock(): {
  MapLayerUpdates: object;
} {
  return {
    MapLayerUpdates: {
      getQueryColumnFromLayer: _getQueryColumnFromLayer,
      withDataSource: _withDataSource,
      withDefaultPopupColumns: _withDefaultPopupColumns,
      withGeoBindingAxis: _withGeoBindingAxis,
      withGeometryBindingType: _withGeometryBindingType,
      withGeometryColumn: _withGeometryColumn,
      withGeometryEncoding: _withGeometryEncoding,
      withGeometryFamily: _withGeometryFamily,
      withGeometrySimplification: _withGeometrySimplification,
      withBoundaryJoin: _withBoundaryJoin,
      withGridBin: _withGridBin,
      withGridSizeMeters: _withGridSizeMeters,
      withGridType: _withGridType,
      withAreaAggregation: _withAreaAggregation,
    },
  };
}
