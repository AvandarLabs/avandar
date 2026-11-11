import { useHotkeys } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { useLayerPanelPage } from "@/views/GisApp/panels/LayerPanel/useLayerPanelPage";
import { usePlaceToolState } from "@/views/GisApp/places/usePlaceToolState";
import { annotationTextOverlayTarget } from "@/views/GisApp/shell/AnnotationTextOverlay/annotationTextOverlayTarget";
import { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import { useFeatureInspector } from "@/views/GisApp/useFeatureInspector";
import { useGisAppChrome } from "@/views/GisApp/useGisApp/useGisAppChrome";
import { useGisAppFeatureList } from "@/views/GisApp/useGisApp/useGisAppFeatureList";
import { useGisAppLayerSelection } from "@/views/GisApp/useGisApp/useGisAppLayerSelection";
import { useGisAppMapCallbacks } from "@/views/GisApp/useGisApp/useGisAppMapCallbacks";
import { useGisAppRendering } from "@/views/GisApp/useGisApp/useGisAppRendering";
import { useHydratedMapSources } from "./MapSourceHydration/useHydratedMapSources/useHydratedMapSources";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { PlaceCoordinate } from "@/clients/places/places.types";
import type { LayerInspectorView } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { PlaceToolState } from "@/views/GisApp/places/PlaceTool.types";
import type { AnnotationTextOverlayTarget } from "@/views/GisApp/shell/AnnotationTextOverlay/annotationTextOverlayTarget";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { GisAppFeatureList } from "@/views/GisApp/useGisApp/useGisAppFeatureList";
import type { Dispatch, SetStateAction } from "react";

type UseGisAppCanvasOptions = {
  callbacks: ReturnType<typeof useGisAppMapCallbacks>;
  chrome: ReturnType<typeof useGisAppChrome>;
  editor: ReturnType<typeof useAvaMapEditor>;
  rendering: ReturnType<typeof useGisAppRendering>;
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
  onEditingTextFeatureIdChange: (
    featureId: AvaMapConfig.AnnotationFeatureId | undefined,
  ) => void;
  onPlacePicked: (coordinate: PlaceCoordinate) => void;
};

type UseSelectCreatedAnnotationOptions = {
  lastCreatedAnnotationId: AvaMapConfig.AnnotationFeatureId | undefined;
  openLayerSettings: () => void;
  setSelectedAnnotationFeatureId: Dispatch<
    SetStateAction<AvaMapConfig.AnnotationFeatureId | undefined>
  >;
  setIsAnnotationRowSelected: Dispatch<SetStateAction<boolean>>;
  setSelectedLayerId: Dispatch<SetStateAction<MapLayer.Id | undefined>>;
};

type GisAppStateExtras = {
  annotationTextOverlayTarget: AnnotationTextOverlayTarget;
  avaMap: AvaMap.T;
  placeToolState: PlaceToolState;
  editingTextFeatureId: AvaMapConfig.AnnotationFeatureId | undefined;
  setEditingTextFeatureId: Dispatch<
    SetStateAction<AvaMapConfig.AnnotationFeatureId | undefined>
  >;
};

/** Opens the layer's settings and increments its Filter focus request. */
function useGisAppInspectorFocus(openLayerSettings: () => void): {
  filterFocusRequest: number;
  onReviewFilter: () => void;
} {
  const [filterFocusRequest, setFilterFocusRequest] = useState(0);
  const onReviewFilter = (): void => {
    openLayerSettings();
    setFilterFocusRequest((current) => {
      return current + 1;
    });
  };

  return { filterFocusRequest, onReviewFilter };
}

/** Shares inspector navigation across the layer panel and status card. */
function useGisAppInspectorNavigation(openLayerSettings: () => void): {
  inspectorView: LayerInspectorView;
  onInspectorViewChange: (view: LayerInspectorView) => void;
} {
  const [inspectorView, setInspectorView] = useState<LayerInspectorView>({
    type: "sections",
  });
  const onInspectorViewChange = useCallback(
    (view: LayerInspectorView) => {
      const opensSettings =
        view.type === "classification" ||
        view.type === "validationReport" ||
        view.type === "matchReport";
      if (opensSettings) {
        openLayerSettings();
      }
      setInspectorView(view);
    },
    [openLayerSettings],
  );
  return { inspectorView, onInspectorViewChange };
}

/** Holds the active map tool and returns to Pan from other modes. */
function useGisAppToolMode(): {
  mapToolMode: MapToolMode;
  setMapToolMode: Dispatch<SetStateAction<MapToolMode>>;
} {
  const [mapToolMode, setMapToolMode] = useState<MapToolMode>({ type: "pan" });
  return { mapToolMode, setMapToolMode };
}

/** Connects the rendered map specification to the map canvas hook. */
function useGisAppCanvas(
  options: Readonly<UseGisAppCanvasOptions>,
): ReturnType<typeof useMapCanvas> {
  return useMapCanvas({
    basemap: options.editor.mapConfig.basemap,
    fitBoundsRequest: options.chrome.fitBoundsRequest,
    interactiveLayerIds: options.rendering.interactiveLayerIds,
    onFeatureClick: options.callbacks.onMapFeatureClick,
    onClusterClick: options.callbacks.onMapClusterClick,
    onViewChange: options.callbacks.onMapViewChange,
    spec: options.rendering.spec,
    view: options.editor.mapConfig.view,
    mapToolMode: options.mapToolMode,
    onMapToolModeChange: options.onMapToolModeChange,
    aoi: options.editor.mapConfig.aoi,
    updateConfig: options.editor.updateConfig,
    onEditingTextFeatureIdChange: options.onEditingTextFeatureIdChange,
    onPlacePicked: options.onPlacePicked,
  });
}

/** Registers the GIS save and chrome-visibility keyboard shortcuts. */
function useGisAppHotkeys(
  options: Readonly<{
    editor: ReturnType<typeof useAvaMapEditor>;
    setIsChromeHidden: (update: (current: boolean) => boolean) => void;
  }>,
): void {
  useHotkeys([
    ["mod+S", options.editor.saveNow],
    [
      "mod+backslash",
      () => {
        options.setIsChromeHidden((current) => {
          return !current;
        });
      },
    ],
  ]);
}

/** Selects a newly drawn annotation and opens it in the layer panel. */
function useSelectCreatedAnnotation(
  options: UseSelectCreatedAnnotationOptions,
): void {
  const {
    lastCreatedAnnotationId,
    openLayerSettings,
    setSelectedAnnotationFeatureId,
    setIsAnnotationRowSelected,
    setSelectedLayerId,
  } = options;
  useEffect(
    function selectCreatedAnnotation() {
      if (!lastCreatedAnnotationId) {
        return;
      }
      openLayerSettings();
      setSelectedAnnotationFeatureId(lastCreatedAnnotationId);
      setIsAnnotationRowSelected(true);
      setSelectedLayerId(undefined);
    },
    [
      lastCreatedAnnotationId,
      openLayerSettings,
      setIsAnnotationRowSelected,
      setSelectedAnnotationFeatureId,
      setSelectedLayerId,
    ],
  );
}

/**
 * Collects the map state, data rendering, and interaction callbacks.
 * `jitterSalt` displaces the map's jittered points.
 */
export function useGisAppState(
  avaMap: AvaMap.T,
  jitterSalt: string,
): ReturnType<typeof useGisAppMapCallbacks> &
  ReturnType<typeof useGisAppCanvas> &
  ReturnType<typeof useGisAppChrome> &
  ReturnType<typeof useAvaMapEditor> &
  ReturnType<typeof useFeatureInspector> &
  ReturnType<typeof useGisAppInspectorFocus> &
  ReturnType<typeof useGisAppInspectorNavigation> &
  ReturnType<typeof useLayerPanelPage> &
  ReturnType<typeof useGisAppRendering> &
  ReturnType<typeof useGisAppLayerSelection> &
  ReturnType<typeof useGisAppToolMode> &
  GisAppFeatureList &
  GisAppStateExtras {
  const draftEditor = useAvaMapEditor(avaMap);
  const editor = useHydratedMapSources({
    editor: draftEditor,
    workspaceId: avaMap.workspaceId,
  });
  const selection = useGisAppLayerSelection(editor.mapConfig);
  const featureInspector = useFeatureInspector();
  const chrome = useGisAppChrome();
  const layerPanel = useLayerPanelPage(chrome.expandPanel);
  const inspectorFocus = useGisAppInspectorFocus(layerPanel.openLayerSettings);
  const inspectorNavigation = useGisAppInspectorNavigation(
    layerPanel.openLayerSettings,
  );
  const [editingTextFeatureId, setEditingTextFeatureId] = useState<
    AvaMapConfig.AnnotationFeatureId | undefined
  >();
  const toolMode = useGisAppToolMode();
  const featureList = useGisAppFeatureList();
  const placeToolState = usePlaceToolState();
  const textOverlayTarget = annotationTextOverlayTarget({
    annotationFeatures: editor.mapConfig.annotations.features,
    editingTextFeatureId,
    mapToolMode: toolMode.mapToolMode,
    selectedAnnotationFeature: selection.selectedAnnotationFeature,
  });
  // The HTML overlay draws its own copy of this text, so the map layer must
  // not draw a second one underneath it.
  const overlayTextFeatureId = textOverlayTarget?.feature.id;
  const hiddenAnnotationFeatureIds = useMemo(() => {
    return overlayTextFeatureId === undefined ? [] : [overlayTextFeatureId];
  }, [overlayTextFeatureId]);
  const rendering = useGisAppRendering({
    avaMap,
    jitterSalt,
    chrome,
    editor,
    hiddenAnnotationFeatureIds,
  });
  const callbacks = useGisAppMapCallbacks({
    editor,
    openLayerSettings: layerPanel.openLayerSettings,
    featureInspector,
    mapConfig: editor.mapConfig,
    setSelectedLayerId: selection.setSelectedLayerId,
    setIsAnnotationRowSelected: selection.setIsAnnotationRowSelected,
    setSelectedAnnotationFeatureId: selection.setSelectedAnnotationFeatureId,
  });
  const canvas = useGisAppCanvas({
    callbacks,
    chrome,
    editor,
    rendering,
    mapToolMode: toolMode.mapToolMode,
    onMapToolModeChange: toolMode.setMapToolMode,
    onEditingTextFeatureIdChange: setEditingTextFeatureId,
    onPlacePicked: placeToolState.onPlacePicked,
  });
  useGisAppHotkeys({ editor, setIsChromeHidden: chrome.setIsChromeHidden });
  useSelectCreatedAnnotation({
    lastCreatedAnnotationId: canvas.lastCreatedAnnotationId,
    openLayerSettings: layerPanel.openLayerSettings,
    setSelectedAnnotationFeatureId: selection.setSelectedAnnotationFeatureId,
    setIsAnnotationRowSelected: selection.setIsAnnotationRowSelected,
    setSelectedLayerId: selection.setSelectedLayerId,
  });
  return {
    ...callbacks,
    ...canvas,
    ...chrome,
    ...editor,
    ...featureInspector,
    ...inspectorFocus,
    ...inspectorNavigation,
    ...layerPanel,
    ...rendering,
    ...selection,
    ...toolMode,
    ...featureList,
    annotationTextOverlayTarget: textOverlayTarget,
    avaMap,
    placeToolState,
    editingTextFeatureId,
    setEditingTextFeatureId,
  };
}

/** State and callbacks shared by the GIS application shell surfaces. */
export type GisAppState = ReturnType<typeof useGisAppState>;
