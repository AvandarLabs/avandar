import { useLingui } from "@lingui/react/macro";
import { MapFurnitureBar } from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar";
import type { GisAppState } from "@/views/GisApp/useGisApp";
import type { ReactNode } from "react";

type Props = { app: GisAppState };

/** Renders attribution and map scale when the map canvas is available. */
export function GisAppFurnitureBar({ app }: Props): ReactNode {
  const { t } = useLingui();
  if (!app.mapInstance) {
    return null;
  }
  const attribution =
    app.mapConfig.basemap.type === "custom" ?
      app.mapConfig.basemap.attribution
    : t`MapLibre, OpenStreetMap contributors`;
  return (
    <MapFurnitureBar mapInstance={app.mapInstance} attribution={attribution} />
  );
}
