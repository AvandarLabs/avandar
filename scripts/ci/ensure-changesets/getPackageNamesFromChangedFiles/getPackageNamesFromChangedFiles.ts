/**
 * Maps changed file paths to the npm package names of the
 * `packages/<tier>/<name>` directories they fall under, given a
 * directory-to-name lookup built from each package's package.json. Files
 * outside `packages/**` or under an unrecognized package directory are
 * ignored.
 */
export function getPackageNamesFromChangedFiles(options: {
  changedFilePaths: readonly string[];
  packageDirToName: ReadonlyMap<string, string>;
}): string[] {
  const { changedFilePaths, packageDirToName } = options;
  const packageNames = new Set(
    changedFilePaths
      .map((filePath) => {
        return filePath.split("/");
      })
      .filter((segments) => {
        return segments[0] === "packages" && segments.length >= 3;
      })
      .map((segments) => {
        return packageDirToName.get(segments.slice(0, 3).join("/"));
      })
      .filter((packageName): packageName is string => {
        return packageName !== undefined;
      }),
  );
  return [...packageNames];
}
