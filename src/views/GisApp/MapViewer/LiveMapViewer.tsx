import { useMemo } from "react";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { resolveRenderJitterSalt } from "@/views/GisApp/layers/resolveRenderJitterSalt/resolveRenderJitterSalt";
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
 * from another workspace. Nothing is drawn until the map's salt is known, so
 * displaced points never move once they appear.
 */
export function LiveMapViewer({ source, display }: Props): ReactNode {
  const [avaMap, isLoadingMap] = AvaMapClient.useGetById({ id: source.mapId });
  const [mapJitterSalt, isLoadingSalt] = AvaMapClient.useGetJitterSalt({
    mapId: source.mapId,
  });
  const jitterSalt = useMemo(() => {
    return resolveRenderJitterSalt(mapJitterSalt);
  }, [mapJitterSalt]);
  if (isLoadingMap || isLoadingSalt) {
    return <MapViewerState kind="loading" heightPx={display.heightPx} />;
  }
  if (!avaMap || avaMap.workspaceId !== source.workspaceId) {
    return <MapViewerState kind="noAccess" heightPx={display.heightPx} />;
  }
  return (
    <LiveMapViewerContent
      avaMap={avaMap}
      jitterSalt={jitterSalt}
      display={display}
    />
  );
}
