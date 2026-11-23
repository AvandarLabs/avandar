/** The storage methods the draft hooks use. */
export type BrowserStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

/**
 * localStorage when the browser allows it, otherwise an in-memory stand-in,
 * so a private window or blocked storage never breaks the editor.
 */
export function getBrowserStorage(): BrowserStorage {
  try {
    window.localStorage.getItem("video-theme-probe");
    return window.localStorage;
  } catch {
    const values = new Map<string, string>();
    return {
      getItem: (key) => {
        return values.get(key) ?? null;
      },
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    };
  }
}
