import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { LiveMapViewerContent } from "@/views/GisApp/MapViewer/LiveMapViewerContent";
import { MapViewerState } from "@/views/GisApp/MapViewer/MapViewerState";
import type {
  MapViewerDisplay,
  MapViewerSource,
} from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = {
  source: Extract<MapViewerSource, { type: "live" }>;
  display: MapViewerDisplay;
};

/**
 * Resolves a live map with the viewer's own access. RLS makes a restricted
 * map and a deleted one look the same, so both show no-access, as does a map
 * from another workspace.
 */
export function LiveMapViewer({ source, display }: Props): ReactNode {
  const [avaMap, isLoadingMap] = AvaMapClient.useGetById({ id: source.mapId });
  if (isLoadingMap) {
    return <MapViewerState kind="loading" heightPx={display.heightPx} />;
  }
  if (!avaMap || avaMap.workspaceId !== source.workspaceId) {
    return <MapViewerState kind="noAccess" heightPx={display.heightPx} />;
  }
  return <LiveMapViewerContent avaMap={avaMap} display={display} />;
}
