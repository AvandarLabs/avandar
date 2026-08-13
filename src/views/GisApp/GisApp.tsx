import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { AvaMap } from "$/models/AvaMap/AvaMap";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import css from "@/views/GisApp/GisApp.module.css";
import { useLayerMapSpec } from "@/views/GisApp/layers/useLayerMapSpec";
import { useMapLayerData } from "@/views/GisApp/layers/useMapLayerData/useMapLayerData";
import { MapCanvas } from "@/views/GisApp/MapCanvas/MapCanvas";
import { MapStatusOverlay } from "@/views/GisApp/MapCanvas/MapStatusOverlay/MapStatusOverlay";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector";
import { LayerFormPanel } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

/**
 * Placeholder names for a map the author has not named yet. They are stored
 * untranslated so switching locale cannot leave a stale translation frozen in
 * state; any surface that displays them translates at render time.
 */
const DEFAULT_MAP_NAME = "Untitled map";
const DEFAULT_LAYER_NAME = "Layer 1";

type Props = { workspaceId: Workspace.Id };

/**
 * The GIS app. Holds the map config in state, runs each layer's query, and
 * hands the resulting declarative spec to the canvas.
 */
export function GisApp({ workspaceId }: Props): ReactNode {
  const [avaMap, setAvaMap] = useState(() => {
    const emptyMap = AvaMap.makeEmpty(DEFAULT_MAP_NAME);
    return {
      ...emptyMap,
      layers: [MapLayer.makeEmpty(DEFAULT_LAYER_NAME)],
    };
  });
  const [selectedFeature, setSelectedFeature] = useState<
    GeoJSON.Feature | undefined
  >(undefined);
  const [isInspectorOpen, { open: openInspector, close: closeInspector }] =
    useDisclosure(false);

  const layer = avaMap.layers[0]!;
  const [queryResult, isLoading, { error }] = useMapLayerData({
    layer,
    workspaceId,
  });

  const updateLayer = useCallback(
    (update: (current: MapLayer.T) => MapLayer.T) => {
      setAvaMap((current) => {
        const currentLayer = current.layers[0]!;
        const nextLayer = update(currentLayer);
        // A handler that found nothing to change returns the same reference.
        // Bailing out here (rather than always spreading a "new" but
        // equal-valued layer) lets React skip the re-render, which stops an
        // upstream effect that reruns on every render from looping forever.
        if (nextLayer === currentLayer) {
          return current;
        }
        return { ...current, layers: [nextLayer, ...current.layers.slice(1)] };
      });
    },
    [],
  );

  const {
    spec,
    fitBounds,
    interactiveLayerIds,
    featureCount,
    hasBinding,
    drops,
  } = useLayerMapSpec({ layer, queryResult });

  const onFeatureClick = useCallback(
    (feature: GeoJSON.Feature) => {
      setSelectedFeature(feature);
      openInspector();
    },
    [openInspector],
  );

  return (
    <Box w="100%" mih="100dvh" pos="relative">
      <MapCanvas
        basemap={avaMap.basemap}
        view={avaMap.view}
        spec={spec}
        fitBounds={fitBounds}
        interactiveLayerIds={interactiveLayerIds}
        onFeatureClick={onFeatureClick}
      >
        <Box className={css.gisAppControlPanel}>
          <LayerFormPanel
            layer={layer}
            basemap={avaMap.basemap}
            onLayerChange={updateLayer}
            onBasemapChange={(basemap) => {
              setAvaMap((current) => {
                return { ...current, basemap };
              });
            }}
          />
        </Box>
        <MapStatusOverlay
          isLoading={isLoading}
          error={error ?? undefined}
          hasBinding={hasBinding}
          featureCount={featureCount}
          drops={drops}
        />
      </MapCanvas>
      <FeatureInspector
        opened={isInspectorOpen}
        onClose={() => {
          closeInspector();
          setSelectedFeature(undefined);
        }}
        feature={selectedFeature}
      />
    </Box>
  );
}
