import { MapCanvasSurface } from "@/views/GisApp/MapCanvas/MapCanvasSurface/MapCanvasSurface";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import type { MapCanvasOptions } from "@/views/GisApp/MapCanvas/useMapCanvas";
import type { ReactNode } from "react";

type Props = MapCanvasOptions;

/**
 * Owns the MapLibre instance: one construction, one style path, one click
 * handler. Rendering data is delegated to `syncMap`.
 */
export function MapCanvas({
  basemap,
  view,
  spec,
  fitBoundsRequest,
  interactiveLayerIds,
  onFeatureClick,
  onViewChange,
}: Props): ReactNode {
  const { containerRef } = useMapCanvas({
    basemap,
    view,
    spec,
    fitBoundsRequest,
    interactiveLayerIds,
    onFeatureClick,
    onViewChange,
  });
  return <MapCanvasSurface containerRef={containerRef} />;
}
