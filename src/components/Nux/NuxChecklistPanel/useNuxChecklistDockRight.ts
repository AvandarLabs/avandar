import { useLayoutEffect, useState } from "react";
import { getNuxChecklistDockRightPx } from "@/components/Nux/NuxChecklistPanel/getNuxChecklistDockRightPx/getNuxChecklistDockRightPx";
import { getVisibleAsideWidthPx } from "@/components/Nux/NuxChecklistPanel/getVisibleAsideWidthPx/getVisibleAsideWidthPx";
import { ProductModalPresence } from "@/components/Nux/NuxChecklistPanel/ProductModalPresence/ProductModalPresence";
import { subscribeToChatAsideLayout } from "@/components/Nux/subscribeToChatAsideLayout/subscribeToChatAsideLayout";
import { CHAT_PANEL_ASIDE_SELECTOR } from "@/config/AppShellLayout.constants";

function _readChecklistDockRightPx(): number {
  if (ProductModalPresence.isOpen()) {
    return getNuxChecklistDockRightPx({
      visibleAsideWidthPx: 0,
      isProductModalOpen: true,
    });
  }
  const aside = document.querySelector(CHAT_PANEL_ASIDE_SELECTOR);
  if (!aside) {
    return getNuxChecklistDockRightPx({ visibleAsideWidthPx: 0 });
  }
  return getNuxChecklistDockRightPx({
    visibleAsideWidthPx: getVisibleAsideWidthPx(
      aside.getBoundingClientRect(),
      window.innerWidth,
    ),
  });
}

/**
 * Tracks how far the checklist dock should sit from the viewport's right edge.
 *
 * Reads the chat Aside from the DOM rather than `ChatPanelStateManager`
 * because `AppShell` mounts its own provider; the visible Aside width is the
 * source of truth for layout either way. A product modal's overlay already
 * covers that aside, so the dock returns to the corner until the modal
 * closes.
 */
export function useNuxChecklistDockRight(): number {
  const [dockRightPx, setDockRightPx] = useState(_readChecklistDockRightPx);

  useLayoutEffect(function trackChatAsideWidth() {
    const updateDockRight = (): void => {
      setDockRightPx(_readChecklistDockRightPx());
    };

    const stopWatchingAside = subscribeToChatAsideLayout(updateDockRight);
    const stopWatchingModals = ProductModalPresence.subscribe(updateDockRight);
    window.addEventListener("resize", updateDockRight);
    return () => {
      stopWatchingAside();
      stopWatchingModals();
      window.removeEventListener("resize", updateDockRight);
    };
  }, []);

  return dockRightPx;
}
