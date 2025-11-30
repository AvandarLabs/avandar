import { isDenoRuntime } from "./isDenoRuntime.ts";
import { isNodeRuntime } from "./isNodeRuntime.ts";
import { isViteBrowserRuntime } from "./isViteBrowserRuntime.ts";

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
  if (isDenoRuntime()) {
    return _cleanOrigin(Deno.env.get("VITE_APP_URL") ?? fallback);
  }

  if (isNodeRuntime()) {
    return _cleanOrigin(process.env.VITE_APP_URL ?? fallback);
  }

  if (isViteBrowserRuntime()) {
    return _cleanOrigin(import.meta.env?.VITE_APP_URL ?? fallback);
  }

  if (fallback) {
    return _cleanOrigin(fallback);
  }

  throw new Error("VITE_APP_URL is not set");
}
