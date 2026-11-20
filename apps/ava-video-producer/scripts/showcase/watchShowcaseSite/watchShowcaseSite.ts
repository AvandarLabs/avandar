import { build } from "vite";
import { makeShowcaseViteConfigFromAppRoot } from "../makeShowcaseViteConfigFromAppRoot";
import { waitForFirstWatchedBuild } from "../waitForFirstWatchedBuild/waitForFirstWatchedBuild";

/** A running watched showcase build. */
export type ShowcaseSiteWatcher = {
  dispose: () => Promise<void>;
};

/**
 * Watches showcase sources and rebuilds every page after each change. Only a
 * successful build calls `onBuilt`, so open pages refresh after it and never
 * after a failed rebuild. A failed first build closes the watcher and throws.
 */
export async function watchShowcaseSite({
  appRoot,
  onBuilt,
}: Readonly<{
  appRoot: string;
  onBuilt: () => Promise<void>;
}>): Promise<ShowcaseSiteWatcher> {
  const watcher = await build(
    makeShowcaseViteConfigFromAppRoot({ appRoot, isWatching: true }),
  );
  if (!("close" in watcher)) {
    throw new Error("The showcase build did not start in watch mode.");
  }
  try {
    await waitForFirstWatchedBuild(watcher, onBuilt);
  } catch (error) {
    await watcher.close();
    throw error;
  }
  return {
    dispose: () => {
      return watcher.close();
    },
  };
}
