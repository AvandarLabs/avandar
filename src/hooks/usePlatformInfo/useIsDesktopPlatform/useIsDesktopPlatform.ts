import { useEffect, useState } from "react";
import { isDesktop } from "$/platform/isDesktop";

/**
 * Reactively tracks whether the page is running inside the Electrobun
 * desktop shell.
 *
 * Reads `<html data-ava-platform>` via {@link isDesktop}; the bun-side
 * `dom-ready` handler in `apps/desktop/main/index.ts` injects that
 * attribute into the page main world. Because the injection can land
 * *after* React's first render of the caller, this hook also observes
 * `<html>` for the attribute appearing and forces a re-render once it
 * does.
 *
 * Why use this instead of calling `isDesktop()` inline at the render
 * site: if Electrobun's `dom-ready` fires *after* the caller's first
 * render, the first render sees `isDesktop()` returning `false`. Without
 * this observer, the component would only correct itself once some other
 * trigger forces a re-render (route load, hook value change, etc.). In
 * practice that happens within microseconds during normal page boot, so
 * the inline call almost always looks fine, but it is a race. This hook
 * removes the race by forcing a re-render the moment the platform marker
 * actually lands. If a caller never sees a flash of "wrong platform" UI
 * on initial load, calling `isDesktop()` directly is sufficient.
 *
 * @returns `true` once the desktop signal is present.
 */
export function useIsDesktopPlatform(): boolean {
  const [isDesktopPlatform, setIsDesktopPlatform] = useState<boolean>(() => {
    return isDesktop();
  });

  useEffect(() => {
    if (isDesktopPlatform) return;
    if (isDesktop()) {
      setIsDesktopPlatform(true);
      return;
    }
    const observer = new MutationObserver(() => {
      if (isDesktop()) setIsDesktopPlatform(true);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-ava-platform"],
    });
    return () => {
      return observer.disconnect();
    };
  }, [isDesktopPlatform]);

  return isDesktopPlatform;
}
