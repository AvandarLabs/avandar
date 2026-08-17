import type { ButtonProps } from "@mantine/core";
import type { UiState } from "@puckeditor/core";

/** Shared size for dashboard editor Puck header toolbar buttons. */
export const DASHBOARD_TOOLBAR_BUTTON_SIZE: ButtonProps["size"] = "compact-sm";

/**
 * Canvas viewport that makes the dashboard frame track the canvas width.
 *
 * Puck's other viewports are fixed pixel widths that it scales down to fit the
 * canvas, which on a laptop lands around 45% and leaves the rows of a table
 * block unreadable. Tracking the canvas renders the dashboard at 1:1 instead.
 */
export const FULL_WIDTH_CANVAS_VIEWPORT: UiState["viewports"]["current"] = {
  width: "100%",
  height: "auto",
};

/**
 * Initial Puck UI state for the dashboard editor.
 *
 * Starts the canvas at {@link FULL_WIDTH_CANVAS_VIEWPORT} so the first paint is
 * already legible. Puck overwrites this once the canvas iframe mounts, which is
 * what `useFullWidthCanvasViewport` exists to correct.
 */
export const DASHBOARD_EDITOR_INITIAL_PUCK_UI: Partial<UiState> = {
  viewports: {
    current: FULL_WIDTH_CANVAS_VIEWPORT,
    options: [],
    controlsVisible: true,
  },
};
