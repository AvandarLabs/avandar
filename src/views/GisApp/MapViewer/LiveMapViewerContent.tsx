import { MapViewerFrame } from "@/views/GisApp/MapViewer/MapViewerFrame";
import { MapViewerState } from "@/views/GisApp/MapViewer/MapViewerState";
import { useLiveMapViewerState } from "@/views/GisApp/MapViewer/useLiveMapViewerState";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapViewerDisplay } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = { avaMap: AvaMap.T; display: MapViewerDisplay };

/** A live map the viewer can read, or no-access when a dataset is hidden. */
export function LiveMapViewerContent({ avaMap, display }: Props): ReactNode {
  const state = useLiveMapViewerState({ avaMap, camera: display.camera });
  if (state.datasetAccess === "denied") {
    return <MapViewerState kind="noAccess" heightPx={display.heightPx} />;
  }
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
