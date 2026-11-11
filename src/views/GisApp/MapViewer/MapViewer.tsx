import "maplibre-gl/dist/maplibre-gl.css";
import { LiveMapViewer } from "@/views/GisApp/MapViewer/LiveMapViewer";
import { SnapshotMapViewer } from "@/views/GisApp/MapViewer/SnapshotMapViewer";
import type {
  MapViewerDisplay,
  MapViewerSource,
} from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = { source: MapViewerSource; display: MapViewerDisplay };

/**
 * A read-only GIS map for surfaces outside the GIS app, such as a dashboard
 * block: live from the map and its datasets, or from a published snapshot
 * that needs no DuckDB.
 */
export function MapViewer({ source, display }: Props): ReactNode {
  return source.type === "live" ? (
    <LiveMapViewer source={source} display={display} />
  ) : (
    <SnapshotMapViewer source={source} display={display} />
  );
}
