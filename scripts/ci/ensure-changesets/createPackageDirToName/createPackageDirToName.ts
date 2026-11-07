export type PackageDirEntry = {
  /** Repo-relative directory, e.g. `packages/web/ui`. */
  packageDir: string;
  packageJson: { name: string; private?: boolean };
};

/**
 * Builds the `packages/<tier>/<name>` directory to package name lookup from
 * each package's parsed package.json. Private packages are skipped: they are
 * listed in the Changesets `ignore` config, and `changeset version` rejects
 * a single changeset that names both ignored and non-ignored packages.
 */
export function createPackageDirToName(
  packageEntries: readonly PackageDirEntry[],
): Map<string, string> {
  return new Map(
    packageEntries
      .filter((entry) => {
        return entry.packageJson.private !== true;
      })
      .map((entry): [string, string] => {
        return [entry.packageDir, entry.packageJson.name];
      }),
  );
}
