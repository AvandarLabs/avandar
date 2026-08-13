import { useLingui } from "@lingui/react/macro";
import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { AvaMap } from "$/models/AvaMap/AvaMap";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { computeBounds } from "@/views/GISApp/layers/computeBounds/computeBounds";
import { computeLayerStats } from "@/views/GISApp/layers/computeLayerStats/computeLayerStats";
import {
  buildLayerId,
  createLayerSpec,
} from "@/views/GISApp/layers/createMapSpec/createLayerSpec/createLayerSpec";
import { createMapSpec } from "@/views/GISApp/layers/createMapSpec/createMapSpec";
import { toFeatureCollection } from "@/views/GISApp/layers/toFeatureCollection/toFeatureCollection";
import { useMapLayerData } from "@/views/GISApp/layers/useMapLayerData/useMapLayerData";
import { MapCanvas } from "@/views/GISApp/MapCanvas/MapCanvas";
import classes from "@/views/GISApp/MapCanvas/MapCanvas.module.css";
import { MapStatusOverlay } from "@/views/GISApp/MapCanvas/MapStatusOverlay";
import { FeatureInspector } from "@/views/GISApp/panels/FeatureInspector/FeatureInspector";
import { LayerFormPanel } from "@/views/GISApp/panels/LayerFormPanel/LayerFormPanel";
import type { Workspace } from "$/models/Workspace/Workspace";

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

type Props = { workspaceId: Workspace.Id };

/**
 * The GIS app. Holds the map config in state, runs each layer's query, and
 * hands the resulting declarative spec to the canvas.
 */
export function GISApp({ workspaceId }: Props): JSX.Element {
  const { t } = useLingui();
  const [avaMap, setAvaMap] = useState(() => {
    const emptyMap = AvaMap.makeEmpty(t`Untitled map`);
    return {
      ...emptyMap,
      layers: [MapLayer.makeEmpty(t`Layer 1`)],
    };
  });
  const [selectedFeature, setSelectedFeature] =
    useState<GeoJSON.Feature | null>(null);
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

  const resolvedBinding = MapLayer.resolveGeoBinding(layer);

  const { featureCollection, drops } = useMemo(() => {
    if (!resolvedBinding || !queryResult) {
      return { featureCollection: EMPTY_FEATURE_COLLECTION, drops: [] };
    }
    return toFeatureCollection({
      rows: queryResult.data,
      binding: resolvedBinding,
      sensitivity: layer.sensitivity,
      layerId: layer.id,
    });
  }, [resolvedBinding, queryResult, layer.sensitivity, layer.id]);

  const { symbology } = layer;
  const { queryColumns } = layer.source;
  const valueColumnName = useMemo(() => {
    if (symbology.type !== "proportionalSymbol") {
      return undefined;
    }
    const column = queryColumns.find((candidate) => {
      return candidate.id === symbology.value;
    });
    return column ? QueryColumn.getDerivedColumnName(column) : undefined;
  }, [symbology, queryColumns]);

  const spec = useMemo(() => {
    return createMapSpec([
      createLayerSpec({
        layer,
        featureCollection,
        stats: computeLayerStats({ featureCollection, valueColumnName }),
        valueColumnName,
      }),
    ]);
  }, [layer, featureCollection, valueColumnName]);

  const fitBounds = useMemo(() => {
    return computeBounds(featureCollection);
  }, [featureCollection]);

  const interactiveLayerIds = useMemo(() => {
    return [buildLayerId(layer.id)];
  }, [layer.id]);

  const handleFeatureClick = useCallback(
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
        onFeatureClick={handleFeatureClick}
      >
        <Box className={classes.controlPanel}>
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
          error={error}
          hasBinding={resolvedBinding !== undefined}
          featureCount={featureCollection.features.length}
          drops={drops}
        />
      </MapCanvas>
      <FeatureInspector
        opened={isInspectorOpen}
        onClose={() => {
          closeInspector();
          setSelectedFeature(null);
        }}
        feature={selectedFeature}
      />
    </Box>
  );
}
