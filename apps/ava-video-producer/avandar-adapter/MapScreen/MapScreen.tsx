import { ActionIcon, Button } from "@mantine/core";
import { IconDownload, IconPlus, IconShare } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { DrawerHeight } from "@/components/CanvasDrawer/DrawerHeight/DrawerHeight";
import { MapCanvasSurface } from "@/views/GisApp/MapCanvas/MapCanvasSurface/MapCanvasSurface";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector/FeatureInspector";
import { LayerList } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { MapFurnitureBar } from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar";
import { MapShell } from "@/views/GisApp/shell/MapShell/MapShell";
import { BasemapControl } from "@/views/GisApp/shell/MapTopBar/BasemapControl/BasemapControl";
import { MapTitleInput } from "@/views/GisApp/shell/MapTopBar/MapTitleInput/MapTitleInput";
import topBarCss from "@/views/GisApp/shell/MapTopBar/MapTopBar.module.css";
import { SaveStateIndicator } from "@/views/GisApp/shell/MapTopBar/SaveStateIndicator/SaveStateIndicator";
import { ViewsMenu } from "@/views/GisApp/shell/MapTopBar/ViewsMenu/ViewsMenu";
import { EASE, mix, ramp } from "../../src/motion";
import {
  _createSpec,
  BASEMAP,
  BASEMAP_ATTRIBUTION,
  caseLayer,
  facilityLayer,
  MAP_BEATS,
  MAP_DURATION,
  PAN,
  selectedCoordinates,
  selectedFacility,
  viewStates,
} from "./mapFixtures";
import css from "./MapScreen.module.css";
import { PointInspector } from "./PointInspector";
import { PointMapTools } from "./PointMapTools";

export { MAP_BEATS, MAP_DURATION };

const _noop = () => undefined;

/** Native MapLibre canvas and product map panels, driven solely by film time. */
export function MapScreen({
  frame,
  width,
  height,
}: {
  frame: number;
  width: number;
  height: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const pointTarget = useRef<HTMLSpanElement>(null);
  const isFacilityHidden = frame >= 308 && frame < 388;
  const layers = useMemo(
    () => [caseLayer, { ...facilityLayer, isVisible: !isFacilityHidden }],
    [isFacilityHidden],
  );
  const spec = useMemo(() => _createSpec(layers), [layers]);
  const selected = frame < 98 ? caseLayer : layers[1]!;
  const camera = ramp(frame, 448, 66, EASE.inOut);
  const view = useMemo(
    () => ({
      center: [
        mix(camera, 10.12, selectedCoordinates[0] + 0.012),
        mix(camera, 10.08, selectedCoordinates[1] + 0.01),
      ] as [number, number],
      zoom: mix(camera, 10.15, 11.05),
    }),
    [camera],
  );
  const controller = useMapCanvas({
    basemap: BASEMAP,
    view,
    spec,
    fitBoundsRequest: undefined,
    interactiveLayerIds: spec.layers.map((layer) => layer.id),
    onFeatureClick: _noop,
    onViewChange: _noop,
    mapToolMode: PAN,
  });
  const { mapInstance } = controller;
  const frameHandle = useMemo(
    () =>
      delayRender(
        `Harborfield map frame ${frame}, style ${mapInstance.styleLoadCount}`,
      ),
    [frame, mapInstance.styleLoadCount],
  );

  useEffect(() => {
    const map = mapInstance.mapRef.current;
    if (!map) return;
    const complete = () => {
      // Idle alone is insufficient if a provider returned an empty/failed style.
      // Require the actual vector source, loaded tiles and rendered geography.
      const basemapLayers = (map.getStyle().layers ?? [])
        .filter((layer) => "source" in layer && layer.source === "openmaptiles")
        .map((layer) => layer.id);
      const geography = basemapLayers.length
        ? map.queryRenderedFeatures({ layers: basemapLayers }).length
        : 0;
      if (
        !map.isStyleLoaded() ||
        !map.areTilesLoaded() ||
        !map.getSource("openmaptiles") ||
        geography === 0
      ) {
        cancelRender(
          new Error("Avandar basemap tiles or geographic features are missing"),
        );
        return;
      }
      if (root.current) {
        root.current.dataset.basemapReady = "true";
        root.current.dataset.basemapFeatures = String(geography);
      }
      if (pointTarget.current) {
        const point = map.project(selectedCoordinates);
        pointTarget.current.style.left = `${point.x - 6}px`;
        pointTarget.current.style.top = `${point.y - 6}px`;
      }
      continueRender(frameHandle);
    };
    const onError = (event: { error?: Error }) =>
      cancelRender(event.error ?? new Error("Native map failed to render"));
    map.once("idle", complete);
    map.on("error", onError);
    map.resize();
    map.triggerRepaint();
    return () => {
      map.off("idle", complete);
      map.off("error", onError);
      continueRender(frameHandle);
    };
  }, [frame, frameHandle, mapInstance, spec, view, height, width]);

  useLayoutEffect(() => {
    root.current?.querySelectorAll("button").forEach((button) => {
      const label = button.getAttribute("aria-label") ?? "";
      if (label.includes(facilityLayer.name) && /hide|show/i.test(label))
        button.setAttribute("data-video-target", "map-facilities-visibility");
      if (
        button.textContent?.includes(facilityLayer.name) &&
        button.hasAttribute("aria-current")
      )
        button.setAttribute("data-video-target", "map-facilities-layer");
      if (
        button.textContent?.trim() === "Data" &&
        button.closest("#gis-inspector-body")
      )
        button.setAttribute("data-video-target", "map-data-section");
    });
    const inspector = root.current?.querySelector(
      'section[aria-labelledby="gis-inspector-title"]',
    );
    const navigation = root.current?.querySelector<HTMLElement>(
      ".maplibregl-ctrl-top-right",
    );
    if (root.current && inspector && navigation) {
      const rootBounds = root.current.getBoundingClientRect();
      const inspectorBounds = inspector.getBoundingClientRect();
      // Dock the unchanged native controls beside the measured inspector.
      // Their product default top-right slot otherwise covers Export.
      navigation.style.right = `${rootBounds.right - inspectorBounds.left + 12}px`;
      navigation.style.top = `${inspectorBounds.top - rootBounds.top}px`;
    }
  }, [frame, mapInstance.styleLoadCount]);

  return (
    <div ref={root} style={{ width, height, overflow: "hidden" }}>
      <MapShell
        mapLabel="Map of Video - Harborfield response map - pilot"
        isChromeHidden={false}
        canvasSurfaceRef={surface}
        topBarRef={_noop}
        leftColumnRef={_noop}
        rightColumnRef={_noop}
        canvas={
          <>
            <MapCanvasSurface containerRef={controller.containerRef} />
            <span
              ref={pointTarget}
              data-video-target="map-facility-point"
              data-video-canvas-target="true"
              className={css.facilityPointTarget}
            />
          </>
        }
        topBar={
          <>
            <div className={topBarCss.mapTopBarCluster}>
              <MapTitleInput
                name="Video - Harborfield response map - pilot"
                onNameChange={_noop}
              />
              <SaveStateIndicator saveState="saved" />
            </div>
            <div className={topBarCss.mapTopBarCluster}>
              <BasemapControl basemap={BASEMAP} onBasemapChange={_noop} />
              <ViewsMenu
                bookmarks={[]}
                onSaveCurrentView={_noop}
                onGoToBookmark={_noop}
                onRemoveBookmark={_noop}
              />
              <Button
                variant="default"
                size="compact-sm"
                leftSection={<IconShare size={16} />}
              >
                Share
              </Button>
              <Button
                size="compact-sm"
                leftSection={<IconDownload size={15} stroke={1.5} />}
              >
                Export
              </Button>
            </div>
          </>
        }
        layerPanel={
          <MapChromePanel
            variant="layers"
            id="gis-layers-panel"
            title="Layers"
            itemCount={2}
            isCollapsed={false}
            onToggleCollapsed={_noop}
            collapseLabel="Collapse the layers panel"
            expandLabel="Expand the layers panel"
            headerActions={
              <ActionIcon
                variant="subtle"
                color="neutral"
                aria-label="Add layer"
              >
                <IconPlus size={16} stroke={1.8} />
              </ActionIcon>
            }
          >
            <LayerList
              rows={[layers[1]!, layers[0]!]}
              viewStates={viewStates}
              selectedLayerId={selected.id}
              onStackOrderChange={_noop}
              onSelectLayer={_noop}
              onToggleLayerVisible={_noop}
              onRenameLayer={_noop}
              onDuplicateLayer={_noop}
              onZoomToLayer={_noop}
              onDeleteLayer={_noop}
            />
          </MapChromePanel>
        }
        inspector={<PointInspector layer={selected} frame={frame} />}
        legend={
          <MapLegend
            layers={[...layers].reverse().filter((layer) => layer.isVisible)}
            hasDrawnDisputedFeature={false}
            isCollapsed={false}
            onToggleCollapsed={_noop}
          />
        }
        statusCard={null}
        toolCluster={<PointMapTools />}
        firstRunCard={null}
        featureDrawer={
          frame >= 548 ? (
            <div
              style={{
                maxHeight:
                  (DrawerHeight.DEFAULT_HEIGHT + 32) * ramp(frame, 548, 13),
                overflow: "hidden",
              }}
            >
              <FeatureInspector
                opened
                onClose={_noop}
                feature={selectedFacility}
                cluster={undefined}
                layer={facilityLayer}
                canvasRef={surface}
                mapRef={mapInstance.mapRef}
                onRowClick={_noop}
                onBackToTable={_noop}
              />
            </div>
          ) : null
        }
        furnitureBar={
          <MapFurnitureBar
            mapInstance={mapInstance}
            attribution={BASEMAP_ATTRIBUTION}
            disclaimer="Fictional demonstration data"
          />
        }
      />
    </div>
  );
}

export { MapScreen as Screen };
