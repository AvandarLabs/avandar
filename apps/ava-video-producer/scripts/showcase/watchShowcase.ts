import { buildProduct } from "../buildProduct/buildProduct";
import { requireLicense } from "../requireLicense";
import { makeShowcasePathsFromAppRoot } from "./makeShowcasePathsFromAppRoot";
import { appRoot } from "./ShowcaseFilms/ShowcaseFilms";
import {
  type ShowcaseSiteWatcher,
  watchShowcaseSite,
} from "./watchShowcaseSite/watchShowcaseSite";

/**
 * Watches product source and every showcase page without serving the repo,
 * calling `onBuilt` after each successful page build. Returns a watcher whose
 * `dispose` stops both builds.
 */
export async function watchShowcase(
  onBuilt: () => Promise<void>,
): Promise<ShowcaseSiteWatcher> {
  requireLicense();
  // The product bundle stays on esbuild: it compiles the enclosing Avandar
  // worktree with Lingui macros, PostCSS, and source provenance. Its rebuilt
  // output is part of the Vite module graph, so a product edit rebuilds the
  // pages too.
  const productBuild = await buildProduct({
    watch: true,
    outputDirectory: makeShowcasePathsFromAppRoot(appRoot).product,
  });
  const site = await watchShowcaseSite({ appRoot, onBuilt }).catch(
    async (error: unknown) => {
      await productBuild?.dispose();
      throw error;
    },
  );
  return {
    dispose: async () => {
      // A product rebuild can start a page rebuild, so stop it first.
      await productBuild?.dispose();
      await site.dispose();
    },
  };
}
