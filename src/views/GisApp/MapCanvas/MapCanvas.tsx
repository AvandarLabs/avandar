import { useLingui } from "@lingui/react/macro";
import { useRef } from "react";
import css from "@/views/GisApp/MapCanvas/MapCanvas.module.css";
import { useFitMapBounds } from "@/views/GisApp/MapCanvas/useFitMapBounds";
import { useMapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import { useMapSpecSync } from "@/views/GisApp/MapCanvas/useMapSpecSync";
import { useMapStyleSync } from "@/views/GisApp/MapCanvas/useMapStyleSync";
import type { MapBounds } from "@/views/GisApp/layers/computeBounds/computeBounds";
import type { MapSpec } from "@/views/GisApp/layers/createMapSpec/MapSpec.types";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = {
  basemap: AvaMap.Basemap;

  /** Seeds the camera at construction; later changes are not applied. */
  view: AvaMap.ViewState;

  spec: MapSpec;

  /** Bounds to fly to, or `undefined` to leave the camera alone. */
  fitBounds: MapBounds | undefined;

  /** Ids of layers whose features respond to clicks. */
  interactiveLayerIds: readonly string[];
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  children?: ReactNode;
};

/**
 * Owns the MapLibre instance: one construction, one style path, one click
 * handler. Rendering data is delegated to `syncMap`.
 */
export function MapCanvas({
  basemap,
  view,
  spec,
  fitBounds,
  interactiveLayerIds,
  onFeatureClick,
  children,
}: Props): ReactNode {
  const { t } = useLingui();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mapInstance = useMapInstance({
    containerRef,
    basemap,
    view,
    interactiveLayerIds,
    onFeatureClick,
  });
  useMapStyleSync({ mapInstance, basemap });
  useMapSpecSync({ mapInstance, spec });
  useFitMapBounds({ mapInstance, fitBounds });

  return (
    <>
      <div
        ref={containerRef}
        className={css.mapCanvas}
        role="region"
        aria-label={t`Map`}
      />
      {children}
    </>
  );
}
