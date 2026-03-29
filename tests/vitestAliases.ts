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
 * Extra Vitest aliases for `packages/node/*` (`@ava-etl`).
 *
 * @param rootDir Repository root directory.
 */
function _getNodePackageVitestAliases(rootDir: string): Record<string, string> {
  return {
    "@ava-etl": resolve(rootDir, "packages/node/ava-etl/src"),
  };
}

type PackageType = "shared" | "web" | "node";

/**
 * Vitest aliases to include in the `resolve.alias` section of the
 * vitest.config.ts file.
 *
 * - shared (`$`, `@clients`, …)
 * - web (`@ui`, `@hooks`)
 * - node (`@ava-etl`)
 *
 * Plus optional `moreAliases` resolved from the repository root.
 *
 * @param options.repoRootDir Repository root directory.
 * @param options.include Which package groups: `shared`, `web`, `node`
 *   (repeat as needed).
 * @param options.moreAliases Extra aliases: keys are import prefixes; values
 *   are paths relative to the repository root.
 */
export function getAppVitestAliases(options: {
  repoRootDir: string;
  include?: readonly PackageType[];
  moreAliases?: Record<string, string>;
}): Record<string, string> {
  const { repoRootDir, include = [], moreAliases = {} } = options;

  const baseAliases: Record<string, string> = include.reduce((acc, type) => {
    switch (type) {
      case "shared":
        return { ...acc, ..._getSharedPackageVitestAliases(repoRootDir) };
      case "web":
        return { ...acc, ..._getWebPackageVitestAliases(repoRootDir) };
      case "node":
        return { ...acc, ..._getNodePackageVitestAliases(repoRootDir) };
      default:
        return acc;
    }
  }, {});

  const additionalAliases = Object.entries(moreAliases).reduce(
    (acc, [aliasName, path]) => {
      acc[aliasName] = resolve(repoRootDir, path);
      return acc;
    },
    {} as Record<string, string>,
  );

  return {
    ...baseAliases,
    ...additionalAliases,
  };
}
