import { isDefined } from "@avandar/utils";
import { hasQueryColumn } from "./hasQueryColumn";
import { withGeometryFamilySymbology } from "./withGeometryFamilySymbology";
import { withQueryColumn } from "./withQueryColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

type GeometryBindingType = "latLngColumns" | "geometryColumn";

/** Returns default simplification for the selected geometry family. */
function _getDefaultSimplification(
  family: MapLayer.GeometryFamily,
): MapLayer.GeometrySimplification | undefined {
  return family === "point" ? undefined : { tolerancePixels: 0.75 };
}

/**
 * Binds one axis of the geo binding to `column`, selecting the column into
 * the layer's query if it is not already there.
 */
function withGeoBindingAxis(
  options: Readonly<{
    layer: MapLayer.T;
    axis: "latitude" | "longitude";
    column: QueryColumn.T | undefined;
  }>,
): MapLayer.T {
  const { layer, axis, column } = options;
  const binding =
    layer.geoBinding?.type === "latLngColumns" ? layer.geoBinding : undefined;
  const isUnchanged =
    column?.id === binding?.[axis] &&
    (!column || hasQueryColumn({ layer, column }));
  if (isUnchanged) {
    return layer;
  }
  const withColumn = column ? withQueryColumn({ layer, column }) : layer;
  return {
    ...withColumn,
    geoBinding: {
      type: "latLngColumns",
      latitude: binding?.latitude,
      longitude: binding?.longitude,
      [axis]: column?.id,
    },
  } as MapLayer.T;
}

/** Exchanges complete latitude and longitude column bindings. */
function swapLatLngColumns(layer: MapLayer.T): MapLayer.T {
  const binding = layer.geoBinding;
  if (
    binding?.type !== "latLngColumns" ||
    !isDefined(binding.latitude) ||
    !isDefined(binding.longitude) ||
    binding.latitude === binding.longitude
  ) {
    return layer;
  }
  return {
    ...layer,
    geoBinding: {
      ...binding,
      latitude: binding.longitude,
      longitude: binding.latitude,
    },
  } as MapLayer.T;
}

function _withLatLngColumnsBinding(layer: MapLayer.T): MapLayer.T {
  if (layer.geoBinding?.type === "latLngColumns") {
    return layer;
  }
  if (layer.sensitivity.mode === "aggregateOnly") {
    return layer;
  }
  return {
    ...layer,
    geoBinding: {
      type: "latLngColumns",
      latitude: undefined,
      longitude: undefined,
    },
    symbology: withGeometryFamilySymbology({ layer, family: "point" }),
  } as MapLayer.T;
}

function _withEncodedGeometryBinding(
  options: Readonly<{ layer: MapLayer.T; geometryColumn: QueryColumn.T }>,
): MapLayer.T {
  const { layer, geometryColumn } = options;
  const withColumn = withQueryColumn({ layer, column: geometryColumn });
  const family =
    layer.sensitivity.mode === "aggregateOnly" ? "polygon" : "point";
  return {
    ...withColumn,
    geoBinding: {
      type: "geometryColumn",
      column: geometryColumn.id,
      encoding: "wkt",
      family,
      simplification: _getDefaultSimplification(family),
      sourceCrs: undefined,
    },
    symbology: withGeometryFamilySymbology({ layer, family }),
  } as MapLayer.T;
}

/** Switches between coordinate and encoded-geometry bindings. */
function withGeometryBindingType(
  options: Readonly<{
    layer: MapLayer.T;
    type: GeometryBindingType;
    geometryColumn?: QueryColumn.T;
  }>,
): MapLayer.T {
  const { layer, type, geometryColumn } = options;
  if (type === "latLngColumns") {
    return _withLatLngColumnsBinding(layer);
  }
  if (!geometryColumn) {
    return layer;
  }
  return _withEncodedGeometryBinding({ layer, geometryColumn });
}

/** Selects the encoded geometry source column and keeps it in the query. */
function withGeometryColumn(
  options: Readonly<{ layer: MapLayer.T; column: QueryColumn.T }>,
): MapLayer.T {
  const { layer, column } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "geometryColumn") {
    return layer;
  }
  const isUnchanged =
    binding.column === column.id && hasQueryColumn({ layer, column });
  if (isUnchanged) {
    return layer;
  }
  const withColumn = withQueryColumn({ layer, column });
  return {
    ...withColumn,
    geoBinding: { ...binding, column: column.id },
  } as MapLayer.T;
}

/** Sets how the selected geometry column is encoded. */
function withGeometryEncoding(
  options: Readonly<{
    layer: MapLayer.T;
    encoding: MapLayer.GeometryEncoding;
  }>,
): MapLayer.T {
  const { layer, encoding } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "geometryColumn" || binding.encoding === encoding) {
    return layer;
  }
  return {
    ...layer,
    geoBinding: { ...binding, encoding },
  } as MapLayer.T;
}

/** Sets expected geometry family and compatible paint defaults. */
function withGeometryFamily(
  options: Readonly<{
    layer: MapLayer.T;
    family: MapLayer.GeometryFamily;
  }>,
): MapLayer.T {
  const { layer, family } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "geometryColumn" || binding.family === family) {
    return layer;
  }
  if (layer.sensitivity.mode === "aggregateOnly" && family !== "polygon") {
    return layer;
  }
  return {
    ...layer,
    geoBinding: {
      ...binding,
      family,
      simplification: _getDefaultSimplification(family),
    },
    symbology: withGeometryFamilySymbology({ layer, family }),
  } as MapLayer.T;
}

/** Sets or disables line and polygon simplification. */
function withGeometrySimplification(
  options: Readonly<{
    layer: MapLayer.T;
    simplification: MapLayer.GeometrySimplification | undefined;
  }>,
): MapLayer.T {
  const { layer, simplification } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "geometryColumn" || binding.family === "point") {
    return layer;
  }
  if (
    binding.simplification?.tolerancePixels === simplification?.tolerancePixels
  ) {
    return layer;
  }
  return {
    ...layer,
    geoBinding: { ...binding, simplification },
  } as MapLayer.T;
}

/** Sets the EPSG code used to reproject a geometry column to WGS 84. */
function withGeometrySourceCrs(
  options: Readonly<{
    layer: MapLayer.T;
    sourceCrs: number | undefined;
  }>,
): MapLayer.T {
  const { layer, sourceCrs } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "geometryColumn" || binding.sourceCrs === sourceCrs) {
    return layer;
  }
  return {
    ...layer,
    geoBinding: { ...binding, sourceCrs },
  } as MapLayer.T;
}

/** Direct geometry and lat/lng binding updates for a map layer. */
export const geometryBindingUpdates = {
  withGeoBindingAxis,
  swapLatLngColumns,
  withGeometryBindingType,
  withGeometryColumn,
  withGeometryEncoding,
  withGeometryFamily,
  withGeometrySimplification,
  withGeometrySourceCrs,
};
