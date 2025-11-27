// remove trailing slash if it's present
function _cleanOrigin(origin: string | undefined): string {
  if (!origin) {
    return "";
  }
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

/**
 * Returns the app URL from the environment variables. This function can be
 * called from many different environments, so we check the browser, Node, and
 * Deno environments.
 *
 * @returns The app URL. The URL is cleaned up so that it is never returned
 * with a trailing slash.
 */
export function getAppURL(fallback?: string): string {
  // node
  if (process.env.VITE_APP_URL) {
    return _cleanOrigin(process.env.VITE_APP_URL ?? fallback);
  }

  // browser
  if (import.meta?.env?.VITE_APP_URL) {
    return _cleanOrigin(import.meta.env.VITE_APP_URL ?? fallback);
  }

  if (!fallback) {
    // this env var is not expected to exist in Deno
    throw new Error("VITE_APP_URL is not set");
  }

  return _cleanOrigin(fallback);
}
