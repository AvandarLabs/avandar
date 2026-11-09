import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { applyDetectedGeometryBinding } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/applyDetectedGeometryBinding";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { useGeometryBindingGuess } from "@/views/GisApp/panels/LayerInspector/DataSection/useGeometryBindingGuess";
import { useDuckDbSpatialAvailability } from "@/views/GisApp/useDuckDbSpatialAvailability";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn as QueryColumnModel } from "$/models/queries/QueryColumn/QueryColumn";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type { GeometryBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeometryBindingGuessFromColumns";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumn.T[];
  boundaryOptions: readonly BoundarySourceOption[];
  onLayerChange: LayerChangeHandler;
};

type BindingTypeValue =
  | "latLngColumns"
  | "geometryColumn"
  | "joinToBoundaries"
  | "aggregatePointsToBoundaries"
  | "binPointsToGrid";

function _getSelectedBindingType(layer: MapLayer.T): BindingTypeValue {
  const type = layer.geoBinding?.type;
  if (
    type === "geometryColumn" ||
    type === "joinToBoundaries" ||
    type === "aggregatePointsToBoundaries" ||
    type === "binPointsToGrid"
  ) {
    return type;
  }
  return "latLngColumns";
}

function _hasUsableBoundary(options: readonly BoundarySourceOption[]): boolean {
  return options.some(({ columns }) => {
    return columns.length >= 2;
  });
}

function _getSpatialDescription(
  i18n: I18n,
  availability: DuckDbSpatialAvailability,
): string | undefined {
  if (availability === "loading") {
    // "geometry support", not "DuckDB Spatial": the engine's name means
    // nothing to the person reading this. And "downloading", not "loading",
    // because the wait is a ~6MB fetch from a CDN, long enough on a slow
    // connection that a dimmed option with no explanation reads as broken.
    return i18n._(
      msg`Geometry support is still downloading. This can take a moment on a slow connection.`,
    );
  }
  if (availability === "unavailable") {
    return i18n._(
      msg`These options need geometry support, which could not be loaded.`,
    );
  }
  return undefined;
}

function _getBindingTypeData(options: {
  i18n: I18n;
  isAggregateOnly: boolean;
  availability: DuckDbSpatialAvailability;
  hasBoundary: boolean;
}): Array<{ value: string; label: string; disabled?: boolean }> {
  const { i18n, isAggregateOnly, availability, hasBoundary } = options;
  const spatialDisabled = availability !== "available";
  const boundaryDisabled = spatialDisabled || !hasBoundary;
  return [
    {
      value: "latLngColumns",
      label: i18n._(msg`Latitude and longitude columns`),
      disabled: isAggregateOnly,
    },
    {
      value: "geometryColumn",
      label: i18n._(msg`Geometry column`),
      disabled: spatialDisabled,
    },
    {
      value: "binPointsToGrid",
      label: i18n._(msg`Bin into a grid`),
      disabled: spatialDisabled,
    },
    {
      value: "joinToBoundaries",
      label: i18n._(msg`Join to boundaries`),
      disabled: boundaryDisabled,
    },
    {
      value: "aggregatePointsToBoundaries",
      label: i18n._(msg`Aggregate points to boundaries`),
      disabled: boundaryDisabled,
    },
  ];
}

function _createDefaultBoundary(
  option: BoundarySourceOption,
): MapLayer.BoundarySource {
  return {
    datasetId: option.dataset.id,
    geometryColumnId: option.columns[0]!.id,
    geometryEncoding: "wkt",
    keyColumnId: option.columns[1]!.id,
    displayNameColumnId: undefined,
    simplification: { tolerancePixels: 0.75 },
  };
}

function _getPointsFromLayer(layer: MapLayer.T): MapLayer.PointBinding {
  const binding = layer.geoBinding;
  if (binding?.type === "latLngColumns") {
    return binding;
  }
  if (binding?.type === "geometryColumn" && binding.family === "point") {
    return {
      type: "geometryColumn",
      column: binding.column,
      encoding: binding.encoding,
      family: "point",
      simplification: undefined,
      sourceCrs: binding.sourceCrs,
    };
  }
  return { type: "latLngColumns", latitude: undefined, longitude: undefined };
}

function _columnNamed(
  columns: readonly QueryColumnModel.T[],
  name: string | undefined,
): QueryColumnModel.T | undefined {
  if (!name) {
    return undefined;
  }
  return columns.find((column) => {
    return QueryColumn.getDerivedColumnName(column) === name;
  });
}

function _withGeometryColumnChoice(options: {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumnModel.T[];
  geometryGuess: GeometryBindingGuess | undefined;
}): MapLayer.T {
  const { layer, sourceColumns, geometryGuess } = options;
  const guessedColumn = _columnNamed(sourceColumns, geometryGuess?.columnName);
  const geometryColumn = guessedColumn ?? sourceColumns[0];
  if (!geometryColumn) {
    return layer;
  }
  const canApplyGuess =
    geometryGuess !== undefined &&
    guessedColumn !== undefined &&
    (layer.sensitivity.mode !== "aggregateOnly" ||
      geometryGuess.family === "polygon");
  if (!canApplyGuess || !geometryGuess || !guessedColumn) {
    return MapLayerUpdates.withGeometryBindingType({
      layer,
      type: "geometryColumn",
      geometryColumn,
    });
  }
  return applyDetectedGeometryBinding({
    layer,
    column: guessedColumn,
    guess: geometryGuess,
    availableColumns: sourceColumns,
  });
}

function _applyBoundaryBinding(options: {
  layer: MapLayer.T;
  value: string;
  sourceColumns: readonly QueryColumnModel.T[];
  boundaryOptions: readonly BoundarySourceOption[];
}): MapLayer.T | undefined {
  const { layer, value, sourceColumns, boundaryOptions } = options;
  const boundaryOption = boundaryOptions.find(({ columns }) => {
    return columns.length >= 2;
  });
  if (value === "joinToBoundaries") {
    const dataKeyColumn = sourceColumns[0];
    if (!boundaryOption || !dataKeyColumn) {
      return layer;
    }
    return MapLayerUpdates.withBoundaryJoin({
      layer,
      dataKeyColumn,
      matching: "exact",
      boundary: _createDefaultBoundary(boundaryOption),
    });
  }
  if (value !== "aggregatePointsToBoundaries" || !boundaryOption) {
    return undefined;
  }
  return MapLayerUpdates.withPointAggregation({
    layer,
    points: _getPointsFromLayer(layer),
    boundary: _createDefaultBoundary(boundaryOption),
  });
}

function _applyBindingTypeChange(options: {
  layer: MapLayer.T;
  value: string;
  sourceColumns: readonly QueryColumnModel.T[];
  boundaryOptions: readonly BoundarySourceOption[];
  geometryGuess: GeometryBindingGuess | undefined;
}): MapLayer.T {
  const { layer, value, sourceColumns, boundaryOptions } = options;
  if (value === "binPointsToGrid") {
    return MapLayerUpdates.withGridBin(layer);
  }
  const boundaryBinding = _applyBoundaryBinding({
    layer,
    value,
    sourceColumns,
    boundaryOptions,
  });
  if (boundaryBinding) {
    return boundaryBinding;
  }
  if (value === "geometryColumn") {
    return _withGeometryColumnChoice({
      layer,
      sourceColumns,
      geometryGuess: options.geometryGuess,
    });
  }
  if (value !== "latLngColumns") {
    return layer;
  }
  return MapLayerUpdates.withGeometryBindingType({
    layer,
    type: value,
    geometryColumn: sourceColumns[0],
  });
}

/** Selects the geometry source while reflecting Spatial capability state. */
export function GeometryBindingTypeSelect({
  layer,
  sourceColumns,
  boundaryOptions,
  onLayerChange,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const geometryGuess = useGeometryBindingGuess({
    dataSource: layer.source.dataSource,
    columns: sourceColumns,
  }).guess;
  // Read only: `GisApp` requests the extension when the map opens, which is
  // always before this control can be reached, so the options below have the
  // whole time the user spends opening the inspector to become selectable.
  const availability = useDuckDbSpatialAvailability();
  return (
    <Select
      label={t`Geometry`}
      data={_getBindingTypeData({
        i18n,
        isAggregateOnly: layer.sensitivity.mode === "aggregateOnly",
        availability,
        hasBoundary: _hasUsableBoundary(boundaryOptions),
      })}
      value={_getSelectedBindingType(layer)}
      allowDeselect={false}
      description={_getSpatialDescription(i18n, availability)}
      onChange={(value) => {
        if (!value) {
          return;
        }
        onLayerChange((current) => {
          return _applyBindingTypeChange({
            layer: current,
            value,
            sourceColumns,
            boundaryOptions,
            geometryGuess,
          });
        });
      }}
    />
  );
}
