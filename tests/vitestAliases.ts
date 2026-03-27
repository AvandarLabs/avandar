import { resolve } from "node:path";

/**
 * Vitest `resolve.alias` entries matching `tsconfig.base.json` `paths` for
 * shared packages (`$`, `@clients`, `@logger`, `@models`, `@modules`,
 * `@utils`).
 *
 * @param rootDir Repository root directory.
 */
function _getSharedPackageVitestAliases(
  rootDir: string,
): Record<string, string> {
  return {
    $: resolve(rootDir, "shared"),
    "@clients": resolve(rootDir, "packages/shared/clients/src"),
    "@logger": resolve(rootDir, "packages/shared/logger/src"),
    "@models": resolve(rootDir, "packages/shared/models/src"),
    "@modules": resolve(rootDir, "packages/shared/modules/src"),
    "@utils": resolve(rootDir, "packages/shared/utils/src"),
  };
}

/**
 * Extra Vitest aliases for `packages/web/*` (`@ui`, `@hooks`).
 *
 * @param rootDir Repository root directory.
 */
function _getWebPackageVitestAliases(rootDir: string): Record<string, string> {
  return {
    "@ui": resolve(rootDir, "packages/web/ui/src"),
    "@hooks": resolve(rootDir, "packages/web/hooks/src"),
  };
}

/**
 * Vitest aliases: shared (`$`, `@clients`, …), optionally web (`@ui`,
 * `@hooks`), plus this package or app’s `selfAlias` → `selfSrcDir`.
 *
 * @param rootDir Repository root directory.
 * @param options.include `only-shared` or shared plus web.
 * @param options.selfAlias Import prefix for this package or app.
 * @param options.selfSrcDir Absolute path to that package or app’s `src`.
 */
export function getAppVitestAliases(
  rootDir: string,
  options: {
    include: "only-shared" | "shared-and-web";
    selfAlias: string;
    selfSrcDir: string;
  },
): Record<string, string> {
  const baseAliases: Record<string, string> =
    options.include === "shared-and-web" ?
      {
        ..._getSharedPackageVitestAliases(rootDir),
        ..._getWebPackageVitestAliases(rootDir),
      }
    : _getSharedPackageVitestAliases(rootDir);

  return {
    ...baseAliases,
    [options.selfAlias]: options.selfSrcDir,
  };
}
