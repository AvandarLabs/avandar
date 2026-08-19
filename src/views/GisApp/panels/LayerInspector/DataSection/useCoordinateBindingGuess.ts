import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useEffect, useMemo } from "react";
import { getGeoBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { GeoBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

function _getGuess(
  columns: readonly QueryColumn.T[],
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

function _findColumn({
  columns,
  name,
}: Readonly<{
  columns: readonly QueryColumn.T[];
  name: string;
}>): QueryColumn.T | undefined {
  return columns.find((column) => {
    return QueryColumn.getDerivedColumnName(column) === name;
  });
}

/** Infers and applies an initial latitude-longitude binding once per source. */
export function useCoordinateBindingGuess({
  layer,
  sourceColumns,
  onLayerChange,
}: Readonly<{
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
}>): GeoBindingGuess | undefined {
  const guess = useMemo(() => {
    return _getGuess(sourceColumns);
  }, [sourceColumns]);
  const hasBinding =
    layer.geoBinding?.type === "latLngColumns" &&
    (layer.geoBinding.latitude !== undefined ||
      layer.geoBinding.longitude !== undefined);

  useEffect(
    function applyCoordinateGuess() {
      if (hasBinding || !guess || sourceColumns.length === 0) {
        return;
      }
      const latitude = _findColumn({
        columns: sourceColumns,
        name: guess.latitudeColumnName,
      });
      const longitude = _findColumn({
        columns: sourceColumns,
        name: guess.longitudeColumnName,
      });
      if (!latitude || !longitude) {
        return;
      }
      onLayerChange((current) => {
        const withLatitude = MapLayerUpdates.withGeoBindingAxis({
          layer: current,
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
          availableColumns: sourceColumns,
        });
      });
    },
    [guess, hasBinding, onLayerChange, sourceColumns],
  );
  return guess;
}
