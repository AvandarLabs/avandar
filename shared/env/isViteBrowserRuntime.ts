/**
 * Checks if we are running in a browser and if the current process was
 * bundled by Vite. This function can be called from many different
 * environments.
 *
 * @returns True if we are running in a browser and the current process was
 * bundled by Vite, false otherwise.
 */
export function isViteBrowserRuntime(): boolean {
  return (
    typeof import.meta !== "undefined" &&
    import.meta.env !== undefined &&
    typeof window !== "undefined"
  );
}
