/**
 * Checks if the current environment was bundled by Vite (determined by the
 * presence of import.meta.env). This function can be called from many different
 * environments.
 *
 * This is different from `isViteBrowserRuntime` because our local scripts
 * do not run in a browser but they still have access to `import.meta.env`
 * because they are bundled by Vite. They use `vite-node` to run, so they are
 * Node scripts with access to `import.meta.env`.
 *
 * **NOTE**: yes, i know that Vite is not a runtime, but I wanted a function
 * name consistent with the other functions in this directory.
 *
 * @returns True if the process was bundled by Vite, false otherwise
 */
export function isViteRuntime(): boolean {
  return typeof import.meta !== "undefined" && import.meta.env !== undefined;
}
