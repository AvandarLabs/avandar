/**
 * Checks if the current environment is the Electrobun desktop shell's Bun
 * main process (not the renderer webview, which is detected by
 * `isViteBrowserRuntime`).
 *
 * Detection relies on the `Bun` global, which is defined in Bun runtimes and
 * absent everywhere else. The `window` check excludes any webview context that
 * might also expose `Bun`.
 *
 * Callers that branch on runtime should check this before `isNodeRuntime`,
 * since Bun also exposes `process.env`.
 *
 * @returns True if the current environment is the desktop Bun runtime, false
 * otherwise.
 */
export function isBunDesktopRuntime(): boolean {
  const g = globalThis as { Bun?: unknown; window?: unknown };
  return typeof g.Bun !== "undefined" && typeof g.window === "undefined";
}
