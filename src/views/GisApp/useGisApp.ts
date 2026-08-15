import { useHotkeys } from "@mantine/hooks";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { useCallback, useState } from "react";
import { FitBoundsRequest } from "@/views/GisApp/layers/FitBoundsRequest/FitBoundsRequest";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { useAvaMapRender } from "@/views/GisApp/layers/useAvaMapRender";
import { useMapLayersData } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { ChromePanelState } from "@/views/GisApp/shell/ChromePanelState/ChromePanelState";
import { useMapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";
import { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import { useFeatureInspector } from "@/views/GisApp/useFeatureInspector";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

type GisAppRenderingOptions = {
  avaMap: AvaMap.T;
  chrome: ReturnType<typeof useGisAppChrome>;
  editor: ReturnType<typeof useAvaMapEditor>;
};

type GisAppMapCallbackOptions = {
  editor: ReturnType<typeof useAvaMapEditor>;
  featureInspector: ReturnType<typeof useFeatureInspector>;
  mapConfig: AvaMapConfig.T;
  setSelectedLayerId: (layerId: MapLayer.Id | undefined) => void;
};

type GisAppCanvasOptions = {
  callbacks: ReturnType<typeof useGisAppMapCallbacks>;
  chrome: ReturnType<typeof useGisAppChrome>;
  editor: ReturnType<typeof useAvaMapEditor>;
  rendering: ReturnType<typeof useGisAppRendering>;
};

type GisAppHotkeyOptions = {
  editor: ReturnType<typeof useAvaMapEditor>;
  setIsChromeHidden: (update: (current: boolean) => boolean) => void;
};

/** Opens the inspector and increments its Filter focus request. */
function useGisAppInspectorFocus(expandPanel: (panel: "inspector") => void) {
  const [filterFocusRequest, setFilterFocusRequest] = useState(0);
  const onReviewFilter = (): void => {
    expandPanel("inspector");
    setFilterFocusRequest((current) => {
      return current + 1;
    });
  };

  return { filterFocusRequest, onReviewFilter };
}

/** Keeps the selected layer valid independently from the current map config. */
function useGisAppLayerSelection(mapConfig: AvaMapConfig.T) {
  const [selectedLayerId, setSelectedLayerId] = useState<
    MapLayer.Id | undefined
  >(mapConfig.layers[mapConfig.layers.length - 1]?.id);
  const rows = AvaMapConfig.toStackOrder(mapConfig);
  const selectedLayer = mapConfig.layers.find((layer) => {
    return layer.id === selectedLayerId;
  });

  return { rows, selectedLayer, selectedLayerId, setSelectedLayerId };
}

/** Creates the panel measurements and map-fit controls shared by the shell. */
function useGisAppChrome() {
  const insets = useMapChromeInsets();
  const [isChromeHidden, setIsChromeHidden] = useState(false);
  const { panelState, togglePanel, expandPanel } =
    ChromePanelState.useChromePanelState(window.innerWidth - 200);
  const { fitBoundsRequest, requestFitBounds } =
    FitBoundsRequest.useFitBoundsRequest(insets.insetsRef);

  return {
    ...insets,
    expandPanel,
    fitBoundsRequest,
    isChromeHidden,
    panelState,
    requestFitBounds,
    setIsChromeHidden,
    togglePanel,
  };
}

/** Loads layer data and derives the renderable map state from it. */
function useGisAppRendering(options: GisAppRenderingOptions) {
  const layerQueryStates = useMapLayersData({
    layers: options.editor.mapConfig.layers,
    workspaceId: options.avaMap.workspaceId,
  });
  const rendering = useAvaMapRender({
    layerQueryStates,
    mapConfig: options.editor.mapConfig,
  });
  FitBoundsRequest.useAutoFitNewLayers({
    layerBounds: rendering.layerBounds,
    requestFitBounds: options.chrome.requestFitBounds,
  });

  return rendering;
}

/** Updates the model and selection in response to map canvas interactions. */
function useGisAppMapCallbacks(options: GisAppMapCallbackOptions) {
  const onMapViewChange = useCallback(
    (view: AvaMapConfig.ViewState) => {
      options.editor.updateConfig((current) => {
        return { ...current, view };
      });
    },
    [options.editor],
  );
  const onMapFeatureClick = useCallback(
    (feature: GeoJSON.Feature, renderedLayerId: string) => {
      const layer = options.mapConfig.layers.find((candidate) => {
        return MapLayerIds.toLayerId(candidate.id) === renderedLayerId;
      });
      if (!layer) {
        return;
      }
      options.setSelectedLayerId(layer.id);
      options.featureInspector.onFeatureClick(feature);
    },
    [options],
  );

  return { onMapFeatureClick, onMapViewChange };
}

/** Connects the rendered map specification to the map canvas hook. */
function useGisAppCanvas(options: GisAppCanvasOptions) {
  return useMapCanvas({
    basemap: options.editor.mapConfig.basemap,
    fitBoundsRequest: options.chrome.fitBoundsRequest,
    interactiveLayerIds: options.rendering.interactiveLayerIds,
    onFeatureClick: options.callbacks.onMapFeatureClick,
    onViewChange: options.callbacks.onMapViewChange,
    spec: options.rendering.spec,
    view: options.editor.mapConfig.view,
  });
}

/** Registers the GIS save and chrome-visibility keyboard shortcuts. */
function useGisAppHotkeys(options: GisAppHotkeyOptions): void {
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

/** Collects the map state, data rendering, and interaction callbacks. */
function useGisAppState(avaMap: AvaMap.T) {
  const editor = useAvaMapEditor(avaMap);
  const selection = useGisAppLayerSelection(editor.mapConfig);
  const featureInspector = useFeatureInspector();
  const chrome = useGisAppChrome();
  const inspectorFocus = useGisAppInspectorFocus(chrome.expandPanel);
  const rendering = useGisAppRendering({ avaMap, chrome, editor });
  const callbacks = useGisAppMapCallbacks({
    editor,
    featureInspector,
    mapConfig: editor.mapConfig,
    setSelectedLayerId: selection.setSelectedLayerId,
  });
  const canvas = useGisAppCanvas({ callbacks, chrome, editor, rendering });
  useGisAppHotkeys({ editor, setIsChromeHidden: chrome.setIsChromeHidden });
  return {
    ...callbacks,
    ...canvas,
    ...chrome,
    ...editor,
    ...featureInspector,
    ...inspectorFocus,
    ...rendering,
    ...selection,
    avaMap,
  };
}

/** State and callbacks shared by the GIS application shell surfaces. */
export type GisAppState = ReturnType<typeof useGisAppState>;

/** Collects the map state, data rendering, and interaction callbacks. */
export function useGisApp(avaMap: AvaMap.T): GisAppState {
  return useGisAppState(avaMap);
}
