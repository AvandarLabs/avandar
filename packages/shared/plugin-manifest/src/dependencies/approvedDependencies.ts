/**
 * npm packages plugin code may depend on. Keep this in sync with the import
 * allowlist in `eslint/plugin-restrictions.js`.
 */
export const APPROVED_PLUGIN_DEPENDENCIES = [
  "@avandar/plugin-sdk",
  "@avandar/plugin-ui",
  "react",
  "simple-statistics",
  "d3-array",
  "date-fns",
] as const;

/** Names in a plugin's `package.json` dependencies that are not approved. */
export function getUnapprovedDependenciesFromPackageJson(
  packageJson: Readonly<{ dependencies?: Readonly<Record<string, string>> }>,
): string[] {
  const approvedNames: readonly string[] = APPROVED_PLUGIN_DEPENDENCIES;
  return Object.keys(packageJson.dependencies ?? {}).filter((name) => {
    return !approvedNames.includes(name);
  });
}
