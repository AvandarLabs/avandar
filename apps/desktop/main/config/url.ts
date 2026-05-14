export type ResolveWebviewUrlArgs = {
  mode: "development" | "production";
  viteDevUrl: string;
  bundledIndexPath: string;
};

/**
 * Resolves the URL the Electrobun webview should load.
 *
 * In development the live Vite dev server URL is returned so HMR keeps
 * working inside the native webview. In production a `file://` URL is
 * built from the absolute filesystem path to the bundled `index.html`
 * that Electrobun ships inside the packaged `.app` / `.exe`.
 *
 * This function is pure: it performs no I/O and does not touch the
 * filesystem, network, or Electrobun runtime. Path existence is the
 * caller's responsibility.
 *
 * @param args.mode - `"development"` (live Vite server) or `"production"`
 *   (packaged bundle).
 * @param args.viteDevUrl - Vite dev server URL. Used only when
 *   `mode === "development"`.
 * @param args.bundledIndexPath - Absolute path to the bundled
 *   `index.html`. Required in production; ignored in development.
 * @returns The URL string to hand to Electrobun when opening the webview.
 * @throws Error When `mode === "production"` and `bundledIndexPath` is empty.
 */
export function resolveWebviewUrl(args: ResolveWebviewUrlArgs): string {
  if (args.mode === "development") {
    return args.viteDevUrl;
  }
  if (!args.bundledIndexPath) {
    throw new Error("bundledIndexPath required in production");
  }
  return `file://${args.bundledIndexPath}`;
}
