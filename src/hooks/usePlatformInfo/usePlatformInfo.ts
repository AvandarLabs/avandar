import { useIsDesktopPlatform } from "@/hooks/usePlatformInfo/useIsDesktopPlatform/useIsDesktopPlatform";

export type PlatformInfo = "web" | "desktop";

/**
 * Reactively reports the runtime platform the page is running in.
 *
 * Returns `"desktop"` once the Electrobun desktop signal is present (see
 * {@link useIsDesktopPlatform}), `"web"` otherwise. The transition from
 * `"web"` to `"desktop"` happens at most once per page lifetime, when the
 * bun-side `dom-ready` injection lands and the underlying observer fires.
 *
 * @returns `"web"` or `"desktop"`.
 */
export function usePlatformInfo(): PlatformInfo {
  return useIsDesktopPlatform() ? "desktop" : "web";
}
