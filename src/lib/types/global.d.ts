import type { GooglePickerAPI } from "@/lib/types/google-picker";
import type { Map as MapLibreMap } from "maplibre-gl";

declare global {
  interface Window {
    /**
     * Development-only E2E inspection hook for projecting a known map feature
     * into the currently rendered MapLibre canvas.
     */
    __avandarE2EMap?: MapLibreMap;

    /**
     * Google API's for different services. This is optional because
     * it is loaded asynchronously on-demand, so it is not always available
     * in the window.
     *
     * Libraries here are loaded with `gapi.load`. You can use `useGoogleAPI`
     * to load libraries here.
     */
    google?: {
      picker?: GooglePickerAPI;
    };
  }

  /**
   * Deno global namespace. This is not available in browsers or Node. We add it
   * here only so that our code in `shared/` (which contains Deno-specific
   * variables) can pass type-checking.
   */
  var Deno: typeof globalThis.Deno | undefined;
}
