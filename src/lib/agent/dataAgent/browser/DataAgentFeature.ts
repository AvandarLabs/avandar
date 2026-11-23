/** Local storage key that turns the Pi-based data agent on for this browser. */
const STORAGE_KEY = "avandar:data-agent";

/**
 * Whether chat on every page except the case designer runs through the
 * Pi-based data agent instead of the `chat` edge function's single-call
 * harness. Off unless the build sets
 * `VITE_AVA_DATA_AGENT=on` or this browser's local storage sets
 * `avandar:data-agent` to `on`, so the agent can be tried in a demo without
 * changing anyone else's chat.
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
