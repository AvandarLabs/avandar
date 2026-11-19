import { useEffect, useState } from "react";
import {
  readRememberedPanelTab,
  rememberPanelTab,
} from "./rememberedPanelTabHelpers/rememberedPanelTabHelpers";
import type { AtlasPanelTab } from "./AtlasPanelTabs";

function _getSessionStorage(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * The open panel tab of an item's modal, kept in session storage so it
 * survives the page reloads Save as new theme causes. The remembered tab is
 * read once as the modal opens, and the open item's tab is written whenever
 * either changes, so stepping to the next item remembers that item's tab too.
 */
export function useRememberedPanelTab(
  itemId: string,
): [AtlasPanelTab, (tab: AtlasPanelTab) => void] {
  const [tab, setTab] = useState<AtlasPanelTab>(() => {
    return readRememberedPanelTab(_getSessionStorage(), itemId);
  });
  useEffect(
    function rememberOpenTab() {
      rememberPanelTab({ storage: _getSessionStorage(), itemId, tab });
    },
    [itemId, tab],
  );
  return [tab, setTab];
}
