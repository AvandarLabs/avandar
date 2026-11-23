import type { LayerInspectorView } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

/** Which page of the single map layer panel is showing. */
export type LayerPanelPage = "list" | "settings";

/**
 * Where the layer panel's Back control goes next.
 *
 * A focused screen, such as a match report or classification, returns to the
 * layer's sections. The sections return to the layer list.
 */
export function stepLayerPanelBack(inspectorView: LayerInspectorView): {
  page: LayerPanelPage;
  inspectorView: LayerInspectorView;
} {
  if (inspectorView.type === "sections") {
    return { page: "list", inspectorView };
  }
  return { page: "settings", inspectorView: { type: "sections" } };
}
