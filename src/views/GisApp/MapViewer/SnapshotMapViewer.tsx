import { useQuery } from "@avandar/query-hooks";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import { PublicMapSnapshotStorageClient } from "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient";
import { MapViewerState } from "@/views/GisApp/MapViewer/MapViewerState";
import { SnapshotMapViewerContent } from "@/views/GisApp/MapViewer/SnapshotMapViewerContent";
import type {
  MapViewerDisplay,
  MapViewerSource,
} from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = {
  source: Extract<MapViewerSource, { type: "snapshot" }>;
  display: MapViewerDisplay;
};

/**
 * Downloads a public dashboard's map snapshot. A generation is immutable, so
 * the file never goes stale once read.
 */
export function SnapshotMapViewer({ source, display }: Props): ReactNode {
  const [download, isLoading] = useQuery({
    queryKey: [
      "map-snapshot",
      source.dashboardId,
      source.snapshotRevision,
      source.mapId,
    ],
    queryFn: async () => {
      // Wrapped because a query may not resolve to `undefined`.
      return {
        snapshot: await PublicMapSnapshotStorageClient.downloadMapSnapshot({
          bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
          dashboardId: source.dashboardId,
          snapshotRevision: source.snapshotRevision,
          mapId: source.mapId,
        }),
      };
    },
    staleTime: Infinity,
  });
  if (!download?.snapshot) {
    return (
      <MapViewerState
        kind={isLoading ? "loading" : "missingSnapshot"}
        heightPx={display.heightPx}
      />
    );
  }
  return (
    <SnapshotMapViewerContent snapshot={download.snapshot} display={display} />
  );
}
