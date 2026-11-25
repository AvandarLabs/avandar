/** Local storage key that turns the Pi-based data agent on for this browser. */
const STORAGE_KEY = "avandar:data-agent";

/**
 * Whether online chat on every page except the case designer runs through
 * the Pi-based data agent instead of the `chat` edge function's single-call
 * harness. Off unless the build sets `VITE_AVA_DATA_AGENT=on` or this
 * browser's local storage sets `avandar:data-agent` to `on`, so the hosted
 * agent can be tried in a demo without changing anyone else's online chat.
 *
 * Offline chat is not behind this switch. A data session's offline turns run
 * through the offline data agent on every page whether it is on or off, and
 * a case-design session keeps the offline pipeline.
 */
function _isEnabled(): boolean {
  if (import.meta.env.VITE_AVA_DATA_AGENT === "on") {
    return true;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/** The data agent's on/off switch. */
export const DataAgentFeature = {
  isEnabled: _isEnabled,
  storageKey: STORAGE_KEY,
};
