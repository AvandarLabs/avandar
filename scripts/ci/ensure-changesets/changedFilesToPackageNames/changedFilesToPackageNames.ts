/**
 * Maps changed file paths to the npm package names of the
 * `packages/<tier>/<name>` directories they fall under, given a
 * directory-to-name lookup built from each package's package.json. Files
 * outside `packages/**` or under an unrecognized package directory are
 * ignored.
 */
export function changedFilesToPackageNames(
  changedFilePaths: readonly string[],
  packageDirToName: ReadonlyMap<string, string>,
): string[] {
  const packageNames = new Set<string>();
  for (const filePath of changedFilePaths) {
    const segments = filePath.split("/");
    if (segments[0] !== "packages" || segments.length < 3) {
      continue;
    }
    const packageDir = segments.slice(0, 3).join("/");
    const packageName = packageDirToName.get(packageDir);
    if (packageName !== undefined) {
      packageNames.add(packageName);
    }
  }
  return [...packageNames];
}
