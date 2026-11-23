import { MapFurnitureBar } from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar";
import { MapShell } from "@/views/GisApp/shell/MapShell/MapShell";
import { MapFilmFeatureDrawer } from "../MapFilmFeatureDrawer";
import { MapFilmLayers } from "../MapFilmLayers";
import { MapFilmTopBar } from "../MapFilmTopBar";
import { BASEMAP_ATTRIBUTION } from "../mapFixtures";
import { PointInspector } from "../PointInspector/PointInspector";
import { PointMapTools } from "../PointMapTools";
import { MapFilmCanvas } from "./MapFilmCanvas/MapFilmCanvas";
import { MapFilmLegend } from "./MapFilmLegend";
import type { useMapScreen } from "../useMapScreen";
import type { ReactNode } from "react";

type Props = Omit<ReturnType<typeof useMapScreen>, "root"> & { frame: number };
const _noop = () => {
  return undefined;
};
/**
 * Compose the real map shell and its film-controlled native product regions.
 */
export function MapFilmShell({
  frame,
  surface,
  pointTarget,
  layers,
  selected,
  controller,
  mapInstance,
}: Readonly<Props>): ReactNode {
  return (
    <MapShell
      mapLabel="Map of Video - Harborfield response map - pilot"
      isChromeHidden={false}
      canvasSurfaceRef={surface}
      topBarRef={_noop}
      leftColumnRef={_noop}
      rightColumnRef={_noop}
      canvas={<MapFilmCanvas {...{ controller, pointTarget }} />}
      topBar={<MapFilmTopBar />}
      layerPanel={<MapFilmLayers layers={layers} selected={selected} />}
      inspector={<PointInspector layer={selected} frame={frame} />}
      legend={<MapFilmLegend layers={layers} />}
      statusCard={null}
      toolCluster={<PointMapTools />}
      firstRunCard={null}
      featureDrawer={
        <MapFilmFeatureDrawer {...{ frame, surface, mapInstance }} />
      }
      furnitureBar={
        <MapFurnitureBar
          mapInstance={mapInstance}
          attribution={BASEMAP_ATTRIBUTION}
          disclaimer="Fictional demonstration data"
        />
      }
    />
  );
}
