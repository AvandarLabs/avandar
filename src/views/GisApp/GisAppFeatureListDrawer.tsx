import { propEq } from "@avandar/utils";
import { MAP_LAYER_FEATURE_LIST_ROW_KEYS } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.constants";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { FeatureListDrawer } from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode, RefObject } from "react";

type Props = {
  app: GisAppState;
  canvasRef: RefObject<HTMLElement | null>;
};

type FeatureListRow = MapLayerFeatureList["rows"][number];

/** Zoom a feature list row flies to, unless the map is already closer. */
const FEATURE_LIST_ROW_ZOOM = 16;

const HIDDEN_ROW_KEYS: ReadonlySet<string> = new Set(
  Object.values(MAP_LAYER_FEATURE_LIST_ROW_KEYS),
);

/** The row's own columns, without the keys a feature list adds. */
function _getRowProperties(row: FeatureListRow): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => {
      return !HIDDEN_ROW_KEYS.has(key);
    }),
  );
}

/**
 * Flies to a listed feature and selects it as a map click on its layer
 * would, which opens its popup in the feature inspector.
 */
function _showFeatureListRow(
  app: GisAppState,
  layer: MapLayer.T,
  row: FeatureListRow,
): void {
  const longitude = row[MAP_LAYER_FEATURE_LIST_ROW_KEYS.longitude];
  const latitude = row[MAP_LAYER_FEATURE_LIST_ROW_KEYS.latitude];
  if (typeof longitude !== "number" || typeof latitude !== "number") {
    return;
  }
  const map = app.mapInstance.mapRef.current;
  map?.flyTo({
    center: [longitude, latitude],
    zoom: Math.max(map.getZoom(), FEATURE_LIST_ROW_ZOOM),
  });
  app.onMapFeatureClick(
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: _getRowProperties(row),
    },
    MapLayerIds.toLayerId(layer.id),
  );
}

/**
 * The GIS shell's feature list drawer, bound to the layer whose list is
 * open. Rendered by `GisAppMapShell` in the in-flow drawer slot under the
 * map.
 */
export function GisAppFeatureListDrawer({ app, canvasRef }: Props): ReactNode {
  const layer = app.featureListLayerId
    ? app.mapConfig.layers.find(propEq("id", app.featureListLayerId))
    : undefined;
  return (
    <FeatureListDrawer
      layer={layer}
      config={app.mapConfig}
      workspaceId={app.avaMap.workspaceId}
      canvasRef={canvasRef}
      onClose={app.closeFeatureList}
      onRowClick={(row) => {
        if (layer) {
          _showFeatureListRow(app, layer, row);
        }
      }}
    />
  );
}
