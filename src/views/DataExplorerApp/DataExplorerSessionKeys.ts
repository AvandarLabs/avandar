/**
 * Session-storage keys owned by the Data Explorer.
 *
 * `sessionStorage` is scoped to a single browser tab and cleared when the tab
 * closes while surviving refreshes, which is the lifetime these one-shot flags
 * want. `aiPanelAutoOpened` guards the one-time auto-open of the AI chat panel
 * on a user's first visit, so it must be cleared on sign-out for the panel to
 * auto-open again on the next login.
 */
export const DataExplorerSessionKeys = {
  aiPanelAutoOpened: "ava.data-explorer.ai-panel-auto-opened",
} as const;
