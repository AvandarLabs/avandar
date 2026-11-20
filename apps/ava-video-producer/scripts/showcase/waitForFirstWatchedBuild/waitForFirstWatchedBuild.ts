import type { Rollup } from "vite";

/**
 * The part of a Rollup watcher `waitForFirstWatchedBuild` listens to. A real
 * `Rollup.RollupWatcher` satisfies it, and so does a plain event emitter.
 */
export type BuildEventWatcher = {
  on: (
    event: "event",
    listener: (event: Rollup.RollupWatcherEvent) => void,
  ) => unknown;
};

/**
 * Settles after the watcher's first build: resolves once it succeeds and
 * rejects with its error when it fails. Calls `onBuilt` after every
 * successful build, never after a failed one.
 *
 * Use it to hold a watched Vite build's startup until its first output
 * exists, for example a dev server that refreshes open pages after each
 * rebuild.
 */
export function waitForFirstWatchedBuild(
  watcher: Readonly<BuildEventWatcher>,
  onBuilt: () => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let isFirstBuild = true;
    // Rollup reports `END` after a failed cycle too, so each cycle tracks
    // whether it reported an error.
    let hasFailed = false;
    watcher.on("event", (event) => {
      if (event.code === "START") {
        hasFailed = false;
      }
      if (event.code === "BUNDLE_END" || event.code === "ERROR") {
        void event.result?.close();
      }
      if (event.code === "ERROR") {
        hasFailed = true;
      }
      if (event.code === "END" && !hasFailed) {
        const built = onBuilt();
        if (isFirstBuild) {
          isFirstBuild = false;
          built.then(resolve, reject);
        } else {
          built.catch((error) => {
            return console.error("Showcase refresh failed:", error);
          });
        }
      }
      if (event.code === "ERROR" && isFirstBuild) {
        isFirstBuild = false;
        reject(event.error);
      }
    });
  });
}
