/**
 * Checks if we are running in a browser and if the current process was
 * bundled by Vite. This function can be called from many different
 * environments.
 *
 * @returns True if we are running in a browser and the current process was
 * bundled by Vite, false otherwise.
 */
export function isViteBrowserRuntime(): boolean {
  const g = globalThis as { window?: unknown };
  const meta = import.meta as ImportMeta & { env?: unknown };
  return (
    typeof import.meta !== "undefined" &&
    meta.env !== undefined &&
    typeof g.window !== "undefined"
  );
}
