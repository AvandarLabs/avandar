type FloatingPanelStoredPosition = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

type DataExplorerPanelPreference = {
  collapsed?: boolean;
  position?: FloatingPanelStoredPosition;
};

export type DataExplorerPanelPreferences = Partial<{
  queryDetails: DataExplorerPanelPreference;
  settings: DataExplorerPanelPreference;
}>;

/**
 * Local storage key prefix for Data Explorer floating panel preferences.
 * The full key is `${PREFIX}:${tabId}` so each browser tab gets its own
 * isolated slot and tabs do not leak positions to one another.
 */
export const DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY_PREFIX =
  "ava.data-explorer.panel-preferences" as const;

/**
 * Builds the localStorage key for a given tab id.
 */
export function buildDataExplorerPanelPreferencesStorageKey(
  tabId: string,
): string {
  return `${DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY_PREFIX}:${tabId}`;
}

function _sanitizePosition(
  value: unknown,
): FloatingPanelStoredPosition | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const position = value as Record<string, unknown>;
  const top = Number.isFinite(position.top) ? Number(position.top) : undefined;
  const left =
    Number.isFinite(position.left) ? Number(position.left) : undefined;
  const right =
    Number.isFinite(position.right) ? Number(position.right) : undefined;
  const bottom =
    Number.isFinite(position.bottom) ? Number(position.bottom) : undefined;

  if (
    top === undefined &&
    left === undefined &&
    right === undefined &&
    bottom === undefined
  ) {
    return undefined;
  }

  return { top, left, right, bottom };
}

function _sanitizePreference(
  value: unknown,
): DataExplorerPanelPreference | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const pref = value as Record<string, unknown>;
  const collapsed =
    typeof pref.collapsed === "boolean" ? pref.collapsed : undefined;
  const position = _sanitizePosition(pref.position);

  if (collapsed === undefined && position === undefined) {
    return undefined;
  }

  return { collapsed, position };
}

/**
 * Reads persisted Data Explorer floating-panel preferences for a given tab.
 */
export function readDataExplorerPanelPreferences(
  tabId: string,
): DataExplorerPanelPreferences {
  try {
    const raw = window.localStorage.getItem(
      buildDataExplorerPanelPreferencesStorageKey(tabId),
    );
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      queryDetails: _sanitizePreference(parsed.queryDetails),
      settings: _sanitizePreference(parsed.settings),
    };
  } catch {
    return {};
  }
}

/**
 * Writes Data Explorer floating-panel preferences for a given tab.
 */
export function writeDataExplorerPanelPreferences(
  tabId: string,
  preferences: DataExplorerPanelPreferences,
): void {
  try {
    window.localStorage.setItem(
      buildDataExplorerPanelPreferencesStorageKey(tabId),
      JSON.stringify(preferences),
    );
  } catch {
    // Storage may be unavailable. The UI can still work in memory.
  }
}

/**
 * Removes the persisted preferences for the given tab id. Called when the
 * tab is closing so we don't accumulate stale entries across sessions.
 */
export function clearDataExplorerPanelPreferences(tabId: string): void {
  try {
    window.localStorage.removeItem(
      buildDataExplorerPanelPreferencesStorageKey(tabId),
    );
  } catch {
    // Storage may be unavailable. Nothing else we can do.
  }
}
