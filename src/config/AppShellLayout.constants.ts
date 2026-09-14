/** Mantine `AppShell` Aside width for the chat panel, in pixels. */
export const CHAT_PANEL_ASIDE_WIDTH_PX = 380;

/** Gap between a fixed dock and the viewport or chat aside edge. */
export const NUX_CHECKLIST_DOCK_GAP_PX = 16;

/** Selector for the workspace shell's chat aside. */
export const CHAT_PANEL_ASIDE_SELECTOR = ".mantine-AppShell-aside";

/**
 * Selector for a view's sticky action bar.
 *
 * Any bar that pins itself to the bottom of a scrolling region sets this
 * attribute, and the NUX checklist docks above whichever one is on screen.
 * An attribute rather than a class because the bars are styled per view by
 * CSS modules, whose class names are hashed and so cannot be looked up.
 */
export const STICKY_ACTION_BAR_SELECTOR = "[data-sticky-action-bar]";
