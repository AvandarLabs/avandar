type FloatingPanelStoredPosition = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

type DataExplorerPanelPreference = {
  opened?: boolean;
  collapsed?: boolean;
  position?: FloatingPanelStoredPosition;
};

export type DataExplorerPanelPreferences = Partial<{
  queryDetails: DataExplorerPanelPreference;
  settings: DataExplorerPanelPreference;
}>;

/**
 * Session-storage key for Data Explorer floating-panel preferences.
 * `sessionStorage` is automatically scoped to a single browser tab and is
 * cleared when the tab is closed, while persisting across page refreshes —
 * which is exactly the lifetime we want for these positions.
 */
export const DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY =
  "ava.data-explorer.panel-preferences" as const;

/**
 * Session-storage key that guards the one-time auto-open of the AI chat panel
 * when the user first visits the Data Explorer. Must be cleared on sign-out so
 * the panel auto-opens again on the next login.
 */
export const DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY =
  "ava.data-explorer.ai-panel-auto-opened" as const;

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
  const opened = typeof pref.opened === "boolean" ? pref.opened : undefined;
  const collapsed =
    typeof pref.collapsed === "boolean" ? pref.collapsed : undefined;
  const position = _sanitizePosition(pref.position);

  if (
    opened === undefined &&
    collapsed === undefined &&
    position === undefined
  ) {
    return undefined;
  }

  return { opened, collapsed, position };
}

/**
 * True when this tab already has persisted floating-panel preferences in
 * `sessionStorage` (including an empty object written on a prior visit).
 */
export function hasDataExplorerPanelPreferencesInSessionStorage(): boolean {
  try {
    return (
      window.sessionStorage.getItem(
        DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY,
      ) !== null
    );
  } catch {
    return false;
  }
}

/**
 * Reads persisted Data Explorer floating-panel preferences for the current
 * browser tab. Reads from `sessionStorage`, so positions persist across
 * refreshes but are wiped when the tab is closed.
 */
// eslint-disable-next-line max-len
export function readDataExplorerPanelPreferences(): DataExplorerPanelPreferences {
  try {
    const raw = window.sessionStorage.getItem(
      DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY,
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
 * Writes Data Explorer floating-panel preferences for the current browser tab.
 */
export function writeDataExplorerPanelPreferences(
  preferences: DataExplorerPanelPreferences,
): void {
  try {
    window.sessionStorage.setItem(
      DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Storage may be unavailable. The UI can still work in memory.
  }
}
