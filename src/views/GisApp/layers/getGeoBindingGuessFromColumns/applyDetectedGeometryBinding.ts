import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { GeometryBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeometryBindingGuessFromColumns";

/**
 * Applies a detected geometry column, its encoding, and its family.
 *
 * The inspector uses it both for the initial default and when Geometry column
 * is chosen, so a point WKT column and a polygon GeoJSON column land the same
 * way.
 */
export function applyDetectedGeometryBinding(
  options: Readonly<{
    layer: MapLayer.T;
    column: QueryColumn.T;
    guess: GeometryBindingGuess;
    availableColumns: readonly QueryColumn.T[];
  }>,
): MapLayer.T {
  const withType = MapLayerUpdates.withGeometryBindingType({
    layer: options.layer,
    type: "geometryColumn",
    geometryColumn: options.column,
  });
  const withEncoding = MapLayerUpdates.withGeometryEncoding({
    layer: withType,
    encoding: options.guess.encoding,
  });
  const withFamily = MapLayerUpdates.withGeometryFamily({
    layer: withEncoding,
    family: options.guess.family,
  });
  const withCrs =
    options.guess.sourceCrs === undefined
      ? withFamily
      : MapLayerUpdates.withGeometrySourceCrs({
          layer: withFamily,
          sourceCrs: options.guess.sourceCrs,
        });
  return MapLayerUpdates.withDefaultPopupColumns({
    layer: withCrs,
    availableColumns: options.availableColumns,
  });
}
