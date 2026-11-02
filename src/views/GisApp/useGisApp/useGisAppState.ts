import { useHotkeys } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { annotationTextOverlayTarget } from "@/views/GisApp/shell/AnnotationTextOverlay/annotationTextOverlayTarget";
import { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import { useFeatureInspector } from "@/views/GisApp/useFeatureInspector";
import { useGisAppChrome } from "@/views/GisApp/useGisApp/useGisAppChrome";
import { useGisAppLayerSelection } from "@/views/GisApp/useGisApp/useGisAppLayerSelection";
import { useGisAppMapCallbacks } from "@/views/GisApp/useGisApp/useGisAppMapCallbacks";
import { useGisAppRendering } from "@/views/GisApp/useGisApp/useGisAppRendering";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerInspectorView } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { AnnotationTextOverlayTarget } from "@/views/GisApp/shell/AnnotationTextOverlay/annotationTextOverlayTarget";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Dispatch, SetStateAction } from "react";

/** Opens the inspector and increments its Filter focus request. */
function useGisAppInspectorFocus(expandPanel: (panel: "inspector") => void): {
  filterFocusRequest: number;
  onReviewFilter: () => void;
} {
  const [filterFocusRequest, setFilterFocusRequest] = useState(0);
  const onReviewFilter = (): void => {
    expandPanel("inspector");
    setFilterFocusRequest((current) => {
      return current + 1;
    });
  };

  return { filterFocusRequest, onReviewFilter };
}

/** Shares inspector navigation across the inspector and status card. */
function useGisAppInspectorNavigation(
  chrome: ReturnType<typeof useGisAppChrome>,
): {
  inspectorView: LayerInspectorView;
  onInspectorViewChange: (view: LayerInspectorView) => void;
} {
  const [inspectorView, setInspectorView] = useState<LayerInspectorView>({
    type: "sections",
  });
  const onInspectorViewChange = useCallback(
    (view: LayerInspectorView) => {
      const isFocusedEditor =
        view.type === "classification" || view.type === "validationReport";
      if (isFocusedEditor) {
        chrome.expandPanel("inspector");
        if (chrome.panelState.layers === false) {
          chrome.togglePanel("layers");
        }
      }
      setInspectorView(view);
    },
    [chrome],
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
  options: Readonly<{
    callbacks: ReturnType<typeof useGisAppMapCallbacks>;
    chrome: ReturnType<typeof useGisAppChrome>;
    editor: ReturnType<typeof useAvaMapEditor>;
    rendering: ReturnType<typeof useGisAppRendering>;
    mapToolMode: MapToolMode;
    onMapToolModeChange: (mode: MapToolMode) => void;
    onEditingTextFeatureIdChange: (
      featureId: AvaMapConfig.AnnotationFeatureId | undefined,
    ) => void;
  }>,
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

/** Selects a newly drawn annotation so the compact inspector can open. */
function useSelectCreatedAnnotation(options: {
  lastCreatedAnnotationId: AvaMapConfig.AnnotationFeatureId | undefined;
  expandPanel: (panel: "inspector") => void;
  setSelectedAnnotationFeatureId: Dispatch<
    SetStateAction<AvaMapConfig.AnnotationFeatureId | undefined>
  >;
  setIsAnnotationRowSelected: Dispatch<SetStateAction<boolean>>;
  setSelectedLayerId: Dispatch<SetStateAction<MapLayer.Id | undefined>>;
}): void {
  const {
    lastCreatedAnnotationId,
    expandPanel,
    setSelectedAnnotationFeatureId,
    setIsAnnotationRowSelected,
    setSelectedLayerId,
  } = options;
  useEffect(
    function selectCreatedAnnotation() {
      if (!lastCreatedAnnotationId) {
        return;
      }
      expandPanel("inspector");
      setSelectedAnnotationFeatureId(lastCreatedAnnotationId);
      setIsAnnotationRowSelected(true);
      setSelectedLayerId(undefined);
    },
    [
      expandPanel,
      lastCreatedAnnotationId,
      setIsAnnotationRowSelected,
      setSelectedAnnotationFeatureId,
      setSelectedLayerId,
    ],
  );
}

/** Collects the map state, data rendering, and interaction callbacks. */
export function useGisAppState(avaMap: AvaMap.T): ReturnType<
  typeof useGisAppMapCallbacks
> &
  ReturnType<typeof useGisAppCanvas> &
  ReturnType<typeof useGisAppChrome> &
  ReturnType<typeof useAvaMapEditor> &
  ReturnType<typeof useFeatureInspector> &
  ReturnType<typeof useGisAppInspectorFocus> &
  ReturnType<typeof useGisAppInspectorNavigation> &
  ReturnType<typeof useGisAppRendering> &
  ReturnType<typeof useGisAppLayerSelection> &
  ReturnType<typeof useGisAppToolMode> & {
    annotationTextOverlayTarget: AnnotationTextOverlayTarget;
    avaMap: AvaMap.T;
    editingTextFeatureId: AvaMapConfig.AnnotationFeatureId | undefined;
    setEditingTextFeatureId: Dispatch<
      SetStateAction<AvaMapConfig.AnnotationFeatureId | undefined>
    >;
  } {
  const editor = useAvaMapEditor(avaMap);
  const selection = useGisAppLayerSelection(editor.mapConfig);
  const featureInspector = useFeatureInspector();
  const chrome = useGisAppChrome();
  const inspectorFocus = useGisAppInspectorFocus(chrome.expandPanel);
  const inspectorNavigation = useGisAppInspectorNavigation(chrome);
  const [editingTextFeatureId, setEditingTextFeatureId] = useState<
    AvaMapConfig.AnnotationFeatureId | undefined
  >();
  const toolMode = useGisAppToolMode();
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
    chrome,
    editor,
    hiddenAnnotationFeatureIds,
  });
  const callbacks = useGisAppMapCallbacks({
    editor,
    expandPanel: chrome.expandPanel,
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
  });
  useGisAppHotkeys({ editor, setIsChromeHidden: chrome.setIsChromeHidden });
  useSelectCreatedAnnotation({
    lastCreatedAnnotationId: canvas.lastCreatedAnnotationId,
    expandPanel: chrome.expandPanel,
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
    ...rendering,
    ...selection,
    ...toolMode,
    annotationTextOverlayTarget: textOverlayTarget,
    avaMap,
    editingTextFeatureId,
    setEditingTextFeatureId,
  };
}

/** State and callbacks shared by the GIS application shell surfaces. */
export type GisAppState = ReturnType<typeof useGisAppState>;
