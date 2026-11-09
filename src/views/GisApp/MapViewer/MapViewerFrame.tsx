import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useState } from "react";
import { MapCanvasSurface } from "@/views/GisApp/MapCanvas/MapCanvasSurface/MapCanvasSurface";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { getMapViewerPopupFromClick } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import { MapViewerFurniture } from "@/views/GisApp/MapViewer/MapViewerFurniture";
import { MapViewerLegend } from "@/views/GisApp/MapViewer/MapViewerLegend";
import { MapViewerPopupCard } from "@/views/GisApp/MapViewer/MapViewerPopupCard";
import { useMapInteractionMode } from "@/views/GisApp/MapViewer/useMapInteractionMode/useMapInteractionMode";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { AvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import type { MapViewerPopup } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import type { MapViewerDisplay } from "@/views/GisApp/MapViewer/MapViewer.types";
import type { ReactNode } from "react";

type Props = {
  mapName: string;
  config: AvaMapConfig.T;
  rendering: AvaMapRender;
  initialView: AvaMapConfig.ViewState;
  onViewChange: (view: AvaMapConfig.ViewState) => void;
  display: MapViewerDisplay;

  /** The workspace's places datasets, whose `place_id` popups never show. */
  placesDatasetIds: ReadonlySet<Dataset.Id>;
};

/**
 * A read-only map: the canvas, its legend, a click popup, and its
 * attribution. No panels, tools, or editing.
 */
export function MapViewerFrame(props: Props): ReactNode {
  const { config, display, rendering } = props;
  const { t } = useLingui();
  const [popup, setPopup] = useState<MapViewerPopup | undefined>();
  const { containerRef, mapInstance } = useMapCanvas({
    basemap: config.basemap,
    view: props.initialView,
    spec: rendering.spec,
    fitBoundsRequest: undefined,
    interactiveLayerIds: display.isInteractive
      ? rendering.interactiveLayerIds
      : [],
    onFeatureClick: (feature, renderedLayerId) => {
      setPopup(
        getMapViewerPopupFromClick({
          config,
          feature,
          renderedLayerId,
          placesDatasetIds: props.placesDatasetIds,
        }),
      );
    },
    onViewChange: props.onViewChange,
  });
  useMapInteractionMode({ mapInstance, isInteractive: display.isInteractive });
  return (
    <section aria-label={t`Map of ${props.mapName}`} className={css.mapViewer}>
      <div
        className={clsx(
          css.mapViewerCanvas,
          !display.isInteractive && css["mapViewerCanvas--fixed"],
        )}
        style={{ height: display.heightPx }}
      >
        <MapCanvasSurface containerRef={containerRef} />
        {display.showLegend ? (
          <MapViewerLegend
            config={config}
            hasDrawnDisputedFeature={rendering.hasDrawnDisputedFeature}
          />
        ) : null}
        {popup ? (
          <MapViewerPopupCard
            popup={popup}
            onClose={() => {
              setPopup(undefined);
            }}
          />
        ) : null}
      </div>
      <MapViewerFurniture
        config={config}
        hasDrawnDisputedFeature={rendering.hasDrawnDisputedFeature}
      />
    </section>
  );
}
