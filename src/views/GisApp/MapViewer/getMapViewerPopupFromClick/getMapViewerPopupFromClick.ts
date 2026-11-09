import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { PointAggregateProperties } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** What a read-only map shows for one clicked feature. */
export type MapViewerPopup = {
  layerName: string;
  rows: ReadonlyArray<{ name: string; value: string }>;
};

const RENDER_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  ...Object.values(MapLayerSpatialFeatureProperties),
  ...Object.values(PointAggregateProperties),
]);

function _formatPropertyValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/**
 * The popup for a click on a read-only map: the clicked layer's popup
 * columns, in popup order, read from the feature. `undefined` when the click
 * did not land on a data layer.
 */
export function getMapViewerPopupFromClick(
  options: Readonly<{
    config: AvaMapConfig.T;
    feature: GeoJSON.Feature;
    renderedLayerId: string;
  }>,
): MapViewerPopup | undefined {
  const layer = options.config.layers.find((candidate) => {
    return (
      MapLayerIds.toLayerId(candidate.id) === options.renderedLayerId ||
      MapLayerIds.getUnclusteredLayerIdFromLayerId(candidate.id) ===
        options.renderedLayerId
    );
  });
  if (!layer) {
    return undefined;
  }
  const properties = options.feature.properties ?? {};
  const popupNames = MapLayer.toPopupColumnNames(layer);
  const names = (
    popupNames === "all" ? Object.keys(properties) : popupNames
  ).filter((name) => {
    return name in properties && !RENDER_PROPERTY_NAMES.has(name);
  });
  return {
    layerName: layer.name,
    rows: names.map((name) => {
      return { name, value: _formatPropertyValue(properties[name]) };
    }),
  };
}
