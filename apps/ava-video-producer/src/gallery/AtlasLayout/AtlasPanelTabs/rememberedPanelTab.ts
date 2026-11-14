import type { AtlasPanelTab } from "./AtlasPanelTabs";

const STORAGE_KEY = "atlas-panel-tab:v1";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

/**
 * The tab an item's modal had open before the page reloaded, which Save as
 * new theme causes by creating a theme file. Details when nothing is
 * remembered for this item, the storage is missing or blocked, or the stored
 * value is not one this reads.
 */
export function readRememberedPanelTab(
  storage: ReadableStorage | undefined,
  itemId: string,
): AtlasPanelTab {
  try {
    const stored: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null");
    if (
      typeof stored === "object" &&
      stored !== null &&
      "itemId" in stored &&
      "tab" in stored &&
      stored.itemId === itemId &&
      stored.tab === "tokens"
    ) {
      return "tokens";
    }
  } catch {
    // Blocked storage or a corrupt value: open on Details.
  }
  return "details";
}

/**
 * Remembers which tab an item's modal has open. Only the Design tokens tab is
 * worth restoring, so choosing Details forgets it. One item is remembered at a
 * time. A blocked storage is ignored.
 */
export function rememberPanelTab(
  storage: WritableStorage | undefined,
  itemId: string,
  tab: AtlasPanelTab,
): void {
  try {
    if (tab === "tokens") {
      storage?.setItem(STORAGE_KEY, JSON.stringify({ itemId, tab }));
    } else {
      storage?.removeItem(STORAGE_KEY);
    }
  } catch {
    // The tab still works for this visit.
  }
}
