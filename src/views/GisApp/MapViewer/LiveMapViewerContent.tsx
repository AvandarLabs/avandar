import { matchLiteral } from "@avandar/utils";
import { MapViewerFrame } from "@/views/GisApp/MapViewer/MapViewerFrame";
import { MapViewerState } from "@/views/GisApp/MapViewer/MapViewerState";
import {
  useLiveMapViewerState,
  useMapDatasetAccess,
} from "@/views/GisApp/MapViewer/useLiveMapViewerState";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapViewerDisplay } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = {
  avaMap: AvaMap.T;
  /** The salt that displaces the map's jittered points. */
  jitterSalt: string;
  display: MapViewerDisplay;
};

function LiveMapViewerCanvas({
  avaMap,
  jitterSalt,
  display,
}: Props): ReactNode {
  const state = useLiveMapViewerState({
    avaMap,
    jitterSalt,
    camera: display.camera,
  });
  return (
    <MapViewerFrame
      mapName={avaMap.name}
      config={state.config}
      rendering={state.rendering}
      initialView={state.initialView}
      onViewChange={state.onViewChange}
      display={display}
      placesDatasetIds={state.placesDatasetIds}
    />
  );
}

/**
 * A live map the viewer can read, or no-access when a dataset is hidden.
 * Nothing is drawn or queried until dataset access is known.
 */
export function LiveMapViewerContent({
  avaMap,
  jitterSalt,
  display,
}: Props): ReactNode {
  const datasetAccess = useMapDatasetAccess(avaMap);
  return matchLiteral(datasetAccess, {
    loading: () => {
      return <MapViewerState kind="loading" heightPx={display.heightPx} />;
    },
    denied: () => {
      return <MapViewerState kind="noAccess" heightPx={display.heightPx} />;
    },
    granted: () => {
      return (
        <LiveMapViewerCanvas
          avaMap={avaMap}
          jitterSalt={jitterSalt}
          display={display}
        />
      );
    },
  });
}
