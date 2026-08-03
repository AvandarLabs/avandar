/**
 * Returns the current page URL (`window.location.href`).
 * Throws when `window.location` is unavailable.
 */
export function getCurrentUrl(): string {
  if (!window?.location) {
    throw new Error("window.location is undefined");
  }
  return window.location.href;
}
