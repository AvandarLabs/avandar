/**
 * Returns `true` when the current runtime is the Electrobun desktop shell,
 * `false` for any browser-only context (including SSR/Node where `window`
 * is undefined).
 *
 * Two independent signals are checked, either of which is sufficient:
 *
 * 1. `window.__AVA_PLATFORM__ === "desktop"`: set by the app's preload
 *    (`apps/desktop/preload/index.ts`) before any page script runs. In
 *    practice Electrobun injects user preloads into a webkit isolated
 *    content world, so this signal isn't visible to React-running-in-page
 *    code; it's kept for any worker/preload-scoped callers that *do* see it.
 * 2. `document.documentElement.dataset.avaPlatform === "desktop"`: set in
 *    the page main world by the bun-side `dom-ready` handler in
 *    `apps/desktop/main/index.ts` via `webview.executeJavascript(...)`.
 *    This is the signal page-side React actually reads. Note that it's set
 *    *after* the page's `dom-ready` fires, so callers invoked very early in
 *    the page lifecycle may not see it yet — UI that depends on this should
 *    observe the attribute (e.g. `MutationObserver`) to re-render.
 *
 * Reads via `globalThis` so the function type-checks cleanly without the
 * `DOM` lib in the ambient compilation.
 *
 * @returns `true` when running inside the Electrobun desktop shell.
 */
export function isDesktop(): boolean {
  const g = globalThis as {
    window?: { __AVA_PLATFORM__?: string };
    document?: {
      documentElement?: { dataset?: { avaPlatform?: string } };
    };
  };

  if (g.window === undefined) {
    return false;
  }
  if (g.window.__AVA_PLATFORM__ === "desktop") {
    return true;
  }
  return g.document?.documentElement?.dataset?.avaPlatform === "desktop";
}
