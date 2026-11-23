import { build } from "vite";
import { makeShowcaseViteConfigFromAppRoot } from "../makeShowcaseViteConfigFromAppRoot";

/**
 * Builds every showcase page once into `out/showcase/browser`, expecting the
 * product bundle to be built already. Use it for a one-off build, for example
 * the `pnpm motion:build` script or a build check against a fixture root.
 */
export async function buildShowcaseSite(appRoot: string): Promise<void> {
  await build(
    makeShowcaseViteConfigFromAppRoot({ appRoot, isWatching: false }),
  );
}
