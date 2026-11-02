import { NUX_CHECKLIST_DOCK_GAP_PX } from "@/config/AppShellLayout.constants";

/** Fixed `right` offset for the checklist dock, in pixels. */
export function getNuxChecklistDockRightPx(options: {
  dockGapPx?: number;
  visibleAsideWidthPx: number;
  /**
   * A product modal's overlay already covers the chat aside, so the dock
   * should sit in the corner rather than shift into the modal footer.
   */
  isProductModalOpen?: boolean;
}): number {
  const dockGapPx = options.dockGapPx ?? NUX_CHECKLIST_DOCK_GAP_PX;
  return options.isProductModalOpen === true
    ? dockGapPx
    : dockGapPx + options.visibleAsideWidthPx;
}
