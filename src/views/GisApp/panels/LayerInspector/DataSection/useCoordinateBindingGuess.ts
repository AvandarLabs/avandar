import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useEffect, useMemo } from "react";
import { getGeoBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { GeoBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type Input = {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
};

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

function _findColumn(
  columns: readonly QueryColumn.T[],
  name: string,
): QueryColumn.T | undefined {
  return columns.find((column) => {
    return QueryColumn.getDerivedColumnName(column) === name;
  });
}

/** Infers and applies an initial latitude-longitude binding once per source. */
export function useCoordinateBindingGuess({
  layer,
  sourceColumns,
  onLayerChange,
}: Input): GeoBindingGuess | undefined {
  const guess = useMemo(() => {
    return _getGuess(sourceColumns);
  }, [sourceColumns]);
  const hasBinding =
    layer.geoBinding?.latitude !== undefined ||
    layer.geoBinding?.longitude !== undefined;

  useEffect(
    function applyCoordinateGuess() {
      if (hasBinding || !guess || sourceColumns.length === 0) {
        return;
      }
      const latitude = _findColumn(sourceColumns, guess.latitudeColumnName);
      const longitude = _findColumn(sourceColumns, guess.longitudeColumnName);
      if (!latitude || !longitude) {
        return;
      }
      onLayerChange((current) => {
        const withLatitude = MapLayerUpdates.withGeoBindingAxis(
          current,
          "latitude",
          latitude,
        );
        const withBoth = MapLayerUpdates.withGeoBindingAxis(
          withLatitude,
          "longitude",
          longitude,
        );
        return MapLayerUpdates.withDefaultPopupColumns(withBoth, sourceColumns);
      });
    },
    [guess, hasBinding, onLayerChange, sourceColumns],
  );
  return guess;
}
