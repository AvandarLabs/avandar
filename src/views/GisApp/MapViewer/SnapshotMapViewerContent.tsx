import { noop } from "@avandar/utils";
import { useMemo } from "react";
import { useAvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import { createSnapshotLayerQueryStates } from "@/views/GisApp/MapViewer/createSnapshotLayerQueryStates/createSnapshotLayerQueryStates";
import { mapViewerCameraToViewState } from "@/views/GisApp/MapViewer/mapViewerCameraToViewState/mapViewerCameraToViewState";
import { MapViewerFrame } from "@/views/GisApp/MapViewer/MapViewerFrame";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { MapViewerDisplay } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

/**
 * A snapshot's properties were already cut to its popup columns when it was
 * published, and a public viewer cannot list the workspace's places
 * datasets, so no extra names are hidden.
 */
const NO_PLACES_DATASET_IDS: ReadonlySet<Dataset.Id> = new Set();

/**
 * Snapshot features arrive already displaced, so the renderer never derives
 * a position and needs no salt. The map's real salt is never published.
 */
const SNAPSHOT_JITTER_SALT = "";

type Props = { snapshot: MapSnapshot; display: MapViewerDisplay };

/** Draws a published snapshot through the live renderer, with no queries. */
export function SnapshotMapViewerContent({
  snapshot,
  display,
}: Props): ReactNode {
  const layerQueryStates = useMemo(() => {
    return createSnapshotLayerQueryStates(snapshot);
  }, [snapshot]);
  const rendering = useAvaMapRender({
    mapConfig: snapshot.config,
    layerQueryStates,
    jitterSalt: SNAPSHOT_JITTER_SALT,
  });
  const initialView = useMemo(() => {
    return mapViewerCameraToViewState({
      camera: display.camera,
      config: snapshot.config,
    });
  }, [display.camera, snapshot.config]);
  return (
    <MapViewerFrame
      mapName={snapshot.mapName}
      config={snapshot.config}
      rendering={rendering}
      initialView={initialView}
      onViewChange={noop}
      display={display}
      placesDatasetIds={NO_PLACES_DATASET_IDS}
    />
  );
}
