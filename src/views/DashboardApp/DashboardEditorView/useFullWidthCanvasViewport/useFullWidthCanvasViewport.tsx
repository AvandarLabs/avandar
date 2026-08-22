import { isPlainObject } from "@avandar/utils";
import { useCallback, useRef } from "react";
import { FULL_WIDTH_CANVAS_VIEWPORT } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.constants";
import { FullWidthCanvasViewportPin } from "@/views/DashboardApp/DashboardEditorView/useFullWidthCanvasViewport/FullWidthCanvasViewportPin";
import type { OnAction, Overrides } from "@puckeditor/core";

type FullWidthCanvasViewport = {
  /** Pass to `<Puck onAction>` so user viewport choices are respected. */
  onAction: OnAction;

  /** Pass to `<Puck overrides>` as the `puck` override. */
  PuckOverride: Overrides["puck"];
};

/**
 * Keeps the Puck canvas at a full-width, 1:1 viewport until the editor's user
 * picks a different one.
 *
 * Puck selects the fixed viewport preset closest to the browser window width,
 * which on a laptop is its 1280px "Large" preset. That preset is wider than
 * the canvas, so Puck scales the dashboard frame down to fit and table blocks
 * become unreadable.
 *
 * Wire up both returned values. Puck reapplies its own choice as the canvas
 * iframe mounts and remounts, so neither the `ui` prop nor a single correction
 * survives it, and `onAction` is what separates a correction from a viewport
 * the user picked deliberately.
 */
export function useFullWidthCanvasViewport(): FullWidthCanvasViewport {
  const hasUserChosenViewportRef = useRef(false);

  const onAction = useCallback<OnAction>((action, appState) => {
    // Puck's automatic selection writes to its store directly and never
    // reaches `onAction`, while the toolbar's viewport buttons dispatch a
    // `setUi` action carrying `viewports`. That is what tells the two apart.
    const isViewportAction =
      action.type === "setUi" &&
      isPlainObject(action.ui) &&
      "viewports" in action.ui;

    if (
      isViewportAction &&
      appState.ui.viewports.current.width !== FULL_WIDTH_CANVAS_VIEWPORT.width
    ) {
      hasUserChosenViewportRef.current = true;
    }
  }, []);

  const PuckOverride = useCallback<Overrides["puck"]>(({ children }) => {
    return (
      <FullWidthCanvasViewportPin
        hasUserChosenViewportRef={hasUserChosenViewportRef}
      >
        {children}
      </FullWidthCanvasViewportPin>
    );
  }, []);

  return { onAction, PuckOverride };
}
