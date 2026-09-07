import { NUX_CHECKLIST_DOCK_GAP_PX } from "@/config/AppShellLayout.constants";

/** Fixed `bottom` offset for the checklist dock, in pixels. */
export function getNuxChecklistDockBottomPx(options: {
  dockGapPx?: number;
  /**
   * How far the tallest on-screen sticky action bar reaches up from the
   * viewport's bottom edge. Zero when no bar is mounted or every one of them
   * is scrolled out of sight.
   */
  stickyActionBarHeightPx: number;
}): number {
  const dockGapPx = options.dockGapPx ?? NUX_CHECKLIST_DOCK_GAP_PX;
  return options.stickyActionBarHeightPx > 0
    ? dockGapPx + options.stickyActionBarHeightPx
    : dockGapPx;
}
