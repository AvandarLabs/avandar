import { useEffect, useMemo } from "react";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { applyDetectedGeometryBinding } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/applyDetectedGeometryBinding";
import { columnHasRecognizedGeometryValue } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/classifyGeometryValue";
import { decideMapBindingAction } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/decideMapBindingAction";
import { getGeoBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { useGeometryBindingGuess } from "@/views/GisApp/panels/LayerInspector/DataSection/useGeometryBindingGuess";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn as QueryColumnModel } from "$/models/queries/QueryColumn/QueryColumn";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  MapBindingAction,
  MapBindingDecisionInput,
} from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/decideMapBindingAction";
import type { GeoBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

function _latLngGuess(
  columns: readonly QueryColumnModel.T[],
): GeoBindingGuess | undefined {
  return getGeoBindingGuessFromColumns(
    columns.map((column) => {
      return {
        name: QueryColumn.getDerivedColumnName(column),
        isNumeric: QueryColumn.isNumeric(column),
      };
    }),
  );
}

function _findColumn(
  columns: readonly QueryColumnModel.T[],
  name: string,
): QueryColumnModel.T | undefined {
  return columns.find((column) => {
    return QueryColumn.getDerivedColumnName(column) === name;
  });
}

function _hasLatLngAxis(layer: MapLayer.T): boolean {
  const binding = layer.geoBinding;
  return (
    binding?.type === "latLngColumns" &&
    (binding.latitude !== undefined || binding.longitude !== undefined)
  );
}

function _boundGeometryColumnName(
  layer: MapLayer.T,
  columns: readonly QueryColumnModel.T[],
): string | undefined {
  const binding = layer.geoBinding;
  if (binding?.type !== "geometryColumn") {
    return undefined;
  }
  const column = columns.find((item) => {
    return item.id === binding.column;
  });
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}

function _applyLatLng(
  layer: MapLayer.T,
  columns: readonly QueryColumnModel.T[],
  action: Extract<MapBindingAction, { type: "latLngColumns" }>,
): MapLayer.T | undefined {
  const latitude = _findColumn(columns, action.latitudeColumnName);
  const longitude = _findColumn(columns, action.longitudeColumnName);
  if (!latitude || !longitude) {
    return undefined;
  }
  const withLatitude = MapLayerUpdates.withGeoBindingAxis({
    layer,
    axis: "latitude",
    column: latitude,
  });
  const withBoth = MapLayerUpdates.withGeoBindingAxis({
    layer: withLatitude,
    axis: "longitude",
    column: longitude,
  });
  return MapLayerUpdates.withDefaultPopupColumns({
    layer: withBoth,
    availableColumns: columns,
  });
}

function _applyAction(
  layer: MapLayer.T,
  columns: readonly QueryColumnModel.T[],
  action: MapBindingAction,
): MapLayer.T | undefined {
  if (action.type === "latLngColumns") {
    return _applyLatLng(layer, columns, action);
  }
  const column = _findColumn(columns, action.guess.columnName);
  if (!column) {
    return undefined;
  }
  return applyDetectedGeometryBinding({
    layer,
    column,
    guess: action.guess,
    availableColumns: columns,
  });
}

function _boundColumnHasGeometry(
  columnName: string | undefined,
  rows: readonly UnknownRow[] | undefined,
): boolean {
  if (!columnName || !rows) {
    return false;
  }
  return columnHasRecognizedGeometryValue(
    rows.map((row) => {
      return row[columnName];
    }),
  );
}

function _decisionInput(options: {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumnModel.T[];
  latLngGuess: GeoBindingGuess | undefined;
  geometrySample: ReturnType<typeof useGeometryBindingGuess>;
}): MapBindingDecisionInput {
  const { layer, sourceColumns, latLngGuess, geometrySample } = options;
  const boundGeometryColumnName = _boundGeometryColumnName(
    layer,
    sourceColumns,
  );
  return {
    hasLatLngAxis: _hasLatLngAxis(layer),
    hasNonLatLngBinding:
      layer.geoBinding !== undefined &&
      layer.geoBinding.type !== "latLngColumns",
    boundGeometryColumnName,
    boundGeometryColumnHasGeometryValue: _boundColumnHasGeometry(
      boundGeometryColumnName,
      geometrySample.rows,
    ),
    latLngGuess,
    geometryGuess: geometrySample.guess,
    isGeometrySampleSettled: geometrySample.isSettled,
    isSpatialUnavailable: geometrySample.isSpatialUnavailable,
    isAggregateOnly: layer.sensitivity.mode === "aggregateOnly",
  };
}

function _isDetectingGeometry(input: MapBindingDecisionInput): boolean {
  return (
    !input.isGeometrySampleSettled &&
    input.latLngGuess?.confidence !== "high" &&
    !input.hasLatLngAxis &&
    !input.hasNonLatLngBinding
  );
}

function useDecidedAction(
  input: MapBindingDecisionInput,
): MapBindingAction | undefined {
  const {
    boundGeometryColumnHasGeometryValue,
    boundGeometryColumnName,
    geometryGuess,
    hasLatLngAxis,
    hasNonLatLngBinding,
    isAggregateOnly,
    isGeometrySampleSettled,
    isSpatialUnavailable,
    latLngGuess,
  } = input;
  return useMemo(() => {
    return decideMapBindingAction({
      boundGeometryColumnHasGeometryValue,
      boundGeometryColumnName,
      geometryGuess,
      hasLatLngAxis,
      hasNonLatLngBinding,
      isAggregateOnly,
      isGeometrySampleSettled,
      isSpatialUnavailable,
      latLngGuess,
    });
  }, [
    boundGeometryColumnHasGeometryValue,
    boundGeometryColumnName,
    geometryGuess,
    hasLatLngAxis,
    hasNonLatLngBinding,
    isAggregateOnly,
    isGeometrySampleSettled,
    isSpatialUnavailable,
    latLngGuess,
  ]);
}

function useBindingAction(options: {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumnModel.T[];
  latLngGuess: GeoBindingGuess | undefined;
  geometrySample: ReturnType<typeof useGeometryBindingGuess>;
}): {
  action: MapBindingAction | undefined;
  isDetectingGeometry: boolean;
} {
  const input = _decisionInput(options);
  return {
    action: useDecidedAction(input),
    isDetectingGeometry: _isDetectingGeometry(input),
  };
}

/**
 * Infers an initial latitude-longitude or geometry-column binding once per
 * source. A `location` column of points becomes point WKT without a manual
 * Geometry, column, and family choice.
 */
export function useCoordinateBindingGuess(
  options: Readonly<{
    layer: MapLayer.T;
    sourceColumns: readonly QueryColumnModel.T[];
    onLayerChange: LayerChangeHandler;
  }>,
): { latLngGuess: GeoBindingGuess | undefined; isDetectingGeometry: boolean } {
  const { layer, sourceColumns, onLayerChange } = options;
  const latLngGuess = useMemo(() => {
    return _latLngGuess(sourceColumns);
  }, [sourceColumns]);
  const geometrySample = useGeometryBindingGuess({
    dataSource: layer.source.dataSource,
    columns: sourceColumns,
  });
  const { action, isDetectingGeometry } = useBindingAction({
    layer,
    sourceColumns,
    latLngGuess,
    geometrySample,
  });
  useEffect(
    function applyBindingGuess() {
      if (!action) {
        return;
      }
      onLayerChange((current) => {
        return _applyAction(current, sourceColumns, action) ?? current;
      });
    },
    [action, onLayerChange, sourceColumns],
  );
  return { latLngGuess, isDetectingGeometry };
}
