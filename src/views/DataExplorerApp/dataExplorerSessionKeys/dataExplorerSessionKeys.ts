/**
 * Session-storage keys owned by the Data Explorer.
 *
 * `sessionStorage` is scoped to a single browser tab and cleared when the tab
 * closes while surviving refreshes, which is the lifetime these one-shot flags
 * want.
 */

/**
 * Guards the one-time auto-open of the AI chat panel when the user first
 * visits the Data Explorer. Must be cleared on sign-out so the panel
 * auto-opens again on the next login.
 */
export const DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY =
  "ava.data-explorer.ai-panel-auto-opened" as const;
