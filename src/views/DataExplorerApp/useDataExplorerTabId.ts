import { useState } from "react";

/**
 * Session-storage key holding the Data Explorer's per-tab id. Lives in
 * sessionStorage so the id survives a tab refresh but is automatically
 * scoped to a single browser tab.
 */
const DATA_EXPLORER_TAB_ID_SESSION_KEY = "ava.data-explorer.tab-id" as const;

function _readOrGenerateTabId(): string {
  try {
    const existing = window.sessionStorage.getItem(
      DATA_EXPLORER_TAB_ID_SESSION_KEY,
    );
    if (existing) {
      return existing;
    }
    const generated = crypto.randomUUID();
    window.sessionStorage.setItem(DATA_EXPLORER_TAB_ID_SESSION_KEY, generated);
    return generated;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Returns a stable id for the current browser tab. Used to scope per-tab
 * preferences (like Data Explorer floating-panel positions) so independent
 * tabs do not overwrite each other's state.
 */
export function useDataExplorerTabId(): string {
  const [tabId] = useState(_readOrGenerateTabId);
  return tabId;
}
