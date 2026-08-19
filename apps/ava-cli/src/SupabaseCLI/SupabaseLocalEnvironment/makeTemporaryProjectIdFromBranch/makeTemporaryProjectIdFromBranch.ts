import { PROJECT_ID_PATTERN } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";

/**
 * Derives the default temporary Supabase project id from a Git branch name.
 *
 * Lowercases, replaces each run of characters outside `a-z`, `0-9`, and `_`
 * with `-`, then trims hyphens. `feat/analytics-p2` becomes
 * `feat-analytics-p2`.
 */
export function makeTemporaryProjectIdFromBranch(branch: string): string {
  const projectId = branch
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    throw new Error(
      `Could not derive a temporary project id from branch "${branch}".`,
    );
  }
  return projectId;
}
