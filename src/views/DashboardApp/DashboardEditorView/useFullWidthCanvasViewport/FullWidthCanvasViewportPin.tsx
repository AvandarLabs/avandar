import type { ReactElement, ReactNode, RefObject } from "react";

import { useEffect } from "react";

import { FULL_WIDTH_CANVAS_VIEWPORT } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.constants";
import { useDashboardPuck } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuck";

type Props = {
  children: ReactNode;

  /** Set once a viewport button in the canvas toolbar has been used. */
  hasUserChosenViewportRef: RefObject<boolean>;
};

/**
 * Renders inside Puck's provider and holds the canvas at a full-width, 1:1
 * viewport until the editor's user picks a different one.
 *
 * See `useFullWidthCanvasViewport`, which owns the ref and the matching
 * `onAction` handler, for why the correction has to repeat.
 */
export function FullWidthCanvasViewportPin({
  children,
  hasUserChosenViewportRef,
}: Props): ReactElement {
  const dispatch = useDashboardPuck((puck) => {
    return puck.dispatch;
  });
  const viewportWidth = useDashboardPuck((puck) => {
    return puck.appState.ui.viewports.current.width;
  });

  useEffect(
    function pinCanvasToFullWidth() {
      if (
        !hasUserChosenViewportRef.current &&
        viewportWidth !== FULL_WIDTH_CANVAS_VIEWPORT.width
      ) {
        dispatch({
          type: "setUi",
          recordHistory: false,
          ui: (previousUi) => {
            return {
              viewports: {
                ...previousUi.viewports,
                current: FULL_WIDTH_CANVAS_VIEWPORT,
              },
            };
          },
        });
      }
    },
    [dispatch, hasUserChosenViewportRef, viewportWidth],
  );

  return <>{children}</>;
}
