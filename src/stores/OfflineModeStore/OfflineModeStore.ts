const OFFLINE_MODE_KEY = "avandar.offlineChat.isOfflineModeOn";

const listeners = new Set<() => void>();

function _subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function _isOn(): boolean {
  try {
    return window.localStorage.getItem(OFFLINE_MODE_KEY) === "on";
  } catch {
    return false;
  }
}

function _setOn(isOn: boolean): void {
  if (isOn === _isOn()) {
    return;
  }
  try {
    if (isOn) {
      window.localStorage.setItem(OFFLINE_MODE_KEY, "on");
    } else {
      window.localStorage.removeItem(OFFLINE_MODE_KEY);
    }
  } catch {
    // Storage disabled: the choice cannot be kept, so it stays off.
  }
  listeners.forEach((listener) => {
    listener();
  });
}

/**
 * The user's offline mode choice for this browser. When it is on, chat runs
 * only on the downloaded offline models. Read by the chat runtime on every
 * turn and by the offline mode control in the composer, which also writes
 * it.
 */
export const OfflineModeStore = {
  /** Subscribes to changes in the choice. */
  subscribe: _subscribe,
  isOn: _isOn,
  setOn: _setOn,
};
