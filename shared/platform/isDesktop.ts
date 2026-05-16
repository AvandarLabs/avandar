/**
 * Returns `true` when the current runtime is the Electrobun desktop shell,
 * `false` for any browser-only context (including SSR/Node where `window`
 * is undefined).
 *
 * The desktop preload script sets `window.__AVA_PLATFORM__ = "desktop"` before
 * any page script runs (see `apps/desktop/preload/index.ts`). This helper is
 * the single source of truth platform-aware code branches on; never read the
 * `__AVA_PLATFORM__` global directly.
 *
 * Reads the marker via `globalThis.window` rather than the bare `window`
 * global so the function type-checks cleanly without the `DOM` lib in the
 * ambient compilation. The runtime semantics are identical.
 *
 * @returns `true` only when `window.__AVA_PLATFORM__ === "desktop"`.
 */
export function isDesktop(): boolean {
  const g = globalThis as {
    window?: { __AVA_PLATFORM__?: string };
  };
  if (g.window === undefined) return false;
  return g.window.__AVA_PLATFORM__ === "desktop";
}
