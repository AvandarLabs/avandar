/** Whether a single check passed, failed, or found something worth a look. */
export type MigrationCheckStatus = "pass" | "fail" | "warn";

/** The outcome of one check, ready to print. */
export type MigrationCheckResult = {
  /** What was checked, phrased as the thing being verified. */
  title: string;
  status: MigrationCheckStatus;
  /** One-line summary shown next to the status. */
  summary: string;
  /**
   * Supporting lines, printed indented under the summary. Empty for a check
   * that passed with nothing to add.
   */
  details: string[];
};

/**
 * Everything the checks need, read once by the caller.
 *
 * The checks are pure functions over this snapshot so they can be tested
 * without a git repository or a filesystem.
 */
export type MigrationsSnapshot = {
  /** Branch the work is compared against, normally `develop`. */
  baseBranch: string;
  /** Branch currently checked out, or undefined on a detached HEAD. */
  currentBranch: string | undefined;
  /** Migration filenames (basenames) in the working tree. */
  workingTreeMigrations: string[];
  /** Migration filenames (basenames) as they exist on the base branch. */
  baseBranchMigrations: string[];
  /**
   * Migrations that exist on the base branch and were changed by this branch.
   * Editing one of these rewrites history that other databases already applied.
   */
  modifiedExistingMigrations: string[];
  /** Contents of each migration this branch adds, keyed by basename. */
  newMigrationContents: Record<string, string>;
  /** Raw `supabase/config.toml`, used for the storage seed-path rule. */
  configToml: string;
  /** Clock reading, injected so the future-timestamp check is testable. */
  now: Date;
};
