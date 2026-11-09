import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useState } from "react";
import { MapCanvasSurface } from "@/views/GisApp/MapCanvas/MapCanvasSurface/MapCanvasSurface";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { getMapViewerPopupFromClick } from "@/views/GisApp/MapViewer/getMapViewerPopupFromClick/getMapViewerPopupFromClick";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import { MapViewerFurniture } from "@/views/GisApp/MapViewer/MapViewerFurniture";
import {
  MAP_VIEWER_SHORT_MAP_MAX_HEIGHT_PX,
  MapViewerLegend,
} from "@/views/GisApp/MapViewer/MapViewerLegend";
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

type OverlaysProps = {
  config: AvaMapConfig.T;
  display: MapViewerDisplay;
  hasDrawnDisputedFeature: boolean;
  popup: MapViewerPopup | undefined;
  onClosePopup: () => void;
};

/**
 * The legend and click popup floating over the canvas. The legend is keyed
 * by whether the map is short, so it returns to that height's default.
 */
function _MapViewerOverlays(props: OverlaysProps): ReactNode {
  const { display } = props;
  const isShortMap = display.heightPx < MAP_VIEWER_SHORT_MAP_MAX_HEIGHT_PX;
  return (
    <>
      {display.showLegend ? (
        <MapViewerLegend
          key={isShortMap ? "short" : "tall"}
          config={props.config}
          hasDrawnDisputedFeature={props.hasDrawnDisputedFeature}
          heightPx={display.heightPx}
        />
      ) : null}
      {props.popup ? (
        <MapViewerPopupCard popup={props.popup} onClose={props.onClosePopup} />
      ) : null}
    </>
  );
}

/**
 * The canvas behind a read-only map, and the popup its clicks open. Pan and
 * zoom follow the display's interaction setting.
 */
function useMapViewerCanvas(props: Props): {
  containerRef: ReturnType<typeof useMapCanvas>["containerRef"];
  popup: MapViewerPopup | undefined;
  closePopup: () => void;
} {
  const { config, display, rendering } = props;
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
  return {
    containerRef,
    popup,
    closePopup: () => {
      setPopup(undefined);
    },
  };
}

/**
 * A read-only map: the canvas, its legend, a click popup, and its
 * attribution. No panels, tools, or editing.
 */
export function MapViewerFrame(props: Props): ReactNode {
  const { config, display, rendering } = props;
  const { t } = useLingui();
  const { containerRef, popup, closePopup } = useMapViewerCanvas(props);
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
        <_MapViewerOverlays
          config={config}
          display={display}
          hasDrawnDisputedFeature={rendering.hasDrawnDisputedFeature}
          popup={popup}
          onClosePopup={closePopup}
        />
      </div>
      <MapViewerFurniture
        config={config}
        hasDrawnDisputedFeature={rendering.hasDrawnDisputedFeature}
      />
    </section>
  );
}
