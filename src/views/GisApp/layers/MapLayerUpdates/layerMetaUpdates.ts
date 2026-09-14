import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Replaces color behavior and invalidates its derived legend output. */
function withLayerColor(
  options: Readonly<{ layer: MapLayer.T; color: MapLayer.Color }>,
): MapLayer.T {
  const { layer, color } = options;
  if (layer.symbology.type === "heatmap") {
    return layer;
  }
  return {
    ...layer,
    symbology: { ...layer.symbology, color },
    legend: { ...layer.legend, breaks: [], entries: [] },
  } as MapLayer.T;
}

/** Applies finite, strictly increasing manual classification cuts. */
function withManualBreaks(
  options: Readonly<{ layer: MapLayer.T; breaks: readonly number[] }>,
): MapLayer.T {
  const { layer, breaks } = options;
  if (layer.symbology.type === "heatmap") {
    return layer;
  }
  const color = layer.symbology.color;
  const isValid = breaks.every((breakValue, index) => {
    return (
      Number.isFinite(breakValue) &&
      (index === 0 || breakValue > breaks[index - 1]!)
    );
  });
  if (color.type !== "graduated" || !isValid) {
    return layer;
  }
  return withLayerColor({
    layer,
    color: {
      ...color,
      classification: { method: "manual", breaks },
    },
  });
}

/** Sets the layer's spatial privacy policy. */
function withSensitivity(
  options: Readonly<{
    layer: MapLayer.T;
    sensitivity: MapLayer.Sensitivity;
  }>,
): MapLayer.T {
  const { layer, sensitivity } = options;
  return MapLayer.withSensitivity(layer, sensitivity);
}

/** Replaces the layer's filter tree. */
function withFilters(
  options: Readonly<{
    layer: MapLayer.T;
    filters: MapLayer.T["source"]["filters"];
  }>,
): MapLayer.T {
  const { layer, filters } = options;
  if (filters === layer.source.filters) {
    return layer;
  }
  return { ...layer, source: { ...layer.source, filters } };
}

/** Sets whether the map AOI excludes this layer's features. */
function _withApplyAoiFilter(
  options: Readonly<{ layer: MapLayer.T; applyAoiFilter: boolean }>,
): MapLayer.T {
  const { layer, applyAoiFilter } = options;
  return applyAoiFilter === layer.applyAoiFilter
    ? layer
    : { ...layer, applyAoiFilter };
}

/** Patches the layer's legend. */
function withLegend(
  options: Readonly<{
    layer: MapLayer.T;
    legend: Partial<MapLayer.Legend>;
  }>,
): MapLayer.T {
  const { layer, legend } = options;
  return { ...layer, legend: { ...layer.legend, ...legend } };
}

/** Renames the layer, keeping its legend title in step until it diverges. */
function withName(
  options: Readonly<{ layer: MapLayer.T; name: string }>,
): MapLayer.T {
  const { layer, name } = options;
  if (name === layer.name) {
    return layer;
  }
  const legend =
    layer.legend.title === layer.name
      ? { ...layer.legend, title: name }
      : layer.legend;
  return { ...layer, name, legend };
}

/** Shows or hides the layer. */
function withVisibility(
  options: Readonly<{ layer: MapLayer.T; isVisible: boolean }>,
): MapLayer.T {
  const { layer, isVisible } = options;
  return isVisible === layer.isVisible ? layer : { ...layer, isVisible };
}

/** Classification, legend, sensitivity, filter, name, and visibility. */
export const layerMetaUpdates = {
  withLayerColor,
  withManualBreaks,
  withSensitivity,
  withFilters,
  withApplyAoiFilter: _withApplyAoiFilter,
  withLegend,
  withName,
  withVisibility,
};
