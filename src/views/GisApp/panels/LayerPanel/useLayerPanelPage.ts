import { useCallback, useState } from "react";
import type { LayerPanelPage } from "@/views/GisApp/panels/LayerPanel/layerPanelNavigation";
import type { ChromePanelId } from "@/views/GisApp/shell/ChromePanelState/ChromePanelState";

type ExpandPanel = (panelId: ChromePanelId) => void;

/**
 * Which page of the map's single layer panel is showing.
 *
 * The list is home. Opening a layer expands the panel when it was collapsed
 * and keeps that choice when the panel is collapsed again. `useGisAppState`
 * reads it and passes `openLayerSettings` to annotation, filter, and map-click
 * flows that need the editor on screen.
 */
export function useLayerPanelPage(expandPanel: ExpandPanel): {
  layerPanelPage: LayerPanelPage;
  openLayerSettings: () => void;
  closeLayerSettings: () => void;
} {
  const [layerPanelPage, setLayerPanelPage] = useState<LayerPanelPage>("list");
  const openLayerSettings = useCallback(() => {
    expandPanel("layers");
    setLayerPanelPage("settings");
  }, [expandPanel]);
  const closeLayerSettings = useCallback(() => {
    setLayerPanelPage("list");
  }, []);
  return { closeLayerSettings, layerPanelPage, openLayerSettings };
}
