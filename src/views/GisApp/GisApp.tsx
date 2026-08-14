import { Box } from "@mantine/core";
import "maplibre-gl/dist/maplibre-gl.css";
import { GisMapCanvas } from "@/views/GisApp/GisMapCanvas/GisMapCanvas";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector";
import { useFeatureInspector } from "@/views/GisApp/useFeatureInspector";
import { useGisMapState } from "@/views/GisApp/useGisMapState";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

type Props = { workspaceId: Workspace.Id };

/**
 * The GIS app. Holds the map config in state, runs each layer's query, and
 * hands the resulting declarative spec to the canvas.
 */
export function GisApp({ workspaceId }: Props): ReactNode {
  const { avaMap, layer, updateLayer, updateBasemap } = useGisMapState();
  const inspector = useFeatureInspector();

  return (
    <Box w="100%" mih="100dvh" pos="relative">
      <GisMapCanvas
        avaMap={avaMap}
        layer={layer}
        onBasemapChange={updateBasemap}
        onFeatureClick={inspector.onFeatureClick}
        onLayerChange={updateLayer}
        workspaceId={workspaceId}
      />
      <FeatureInspector
        opened={inspector.isInspectorOpen}
        onClose={inspector.closeInspector}
        feature={inspector.selectedFeature}
      />
    </Box>
  );
}
