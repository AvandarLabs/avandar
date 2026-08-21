import { MapFurnitureBar } from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar";
import { useBasemapAttribution } from "@/views/GisApp/useBasemapAttribution";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

/** Renders attribution and map scale when the map canvas is available. */
export function GisAppFurnitureBar({ app }: Props): ReactNode {
  const attribution = useBasemapAttribution(app.mapConfig.basemap);
  if (!app.mapInstance) {
    return null;
  }
  return (
    <MapFurnitureBar
      mapInstance={app.mapInstance}
      attribution={attribution}
      disclaimer={app.mapConfig.exportLayout.disclaimer}
    />
  );
}
