/**
 * The line `ava release` cuts, read by the release CLI to know which
 * branches, version suffixes, and workflows a release uses: `develop` is
 * released to `main`, which deploys production.
 */
export type ReleaseLine = Readonly<{
  kind: "mainline";
  /** The branch a release is cut from and which `ava release` runs on. */
  sourceBranch: string;
  /** The branch a release publishes to. Pushing it deploys. */
  targetBranch: string;
  /** Appended to a released version. Empty, so `0.15.0` stays `0.15.0`. */
  releaseSuffix: string;
  /** Carried by the source branch between releases, e.g. `-dev`. */
  devSuffix: string;
  /** The workflow whose verdict on the source branch gates a release. */
  sourceCiWorkflow: string;
  /** The workflow that runs when the target branch is pushed. */
  targetDeployWorkflow: string;
  /** What pushing the target branch does, warned about before confirming. */
  deployWarning: string;
}>;

/** The release line `ava release` cuts on `develop`, publishing to `main`. */
export const MAINLINE_RELEASE_LINE: ReleaseLine = {
  kind: "mainline",
  sourceBranch: "develop",
  targetBranch: "main",
  releaseSuffix: "",
  devSuffix: "-dev",
  sourceCiWorkflow: "staging.yaml",
  targetDeployWorkflow: "production.yaml",
  deployWarning:
    "Pushing main deploys production and migrates the production database.",
};

const RELEASE_LINES: readonly ReleaseLine[] = [MAINLINE_RELEASE_LINE];

/**
 * Gets the line released from `branch`, so `ava release` knows what to cut
 * from the current branch. Undefined when releases may not be cut from it:
 * only `develop` qualifies, and the target branch (`main`) is never released
 * from.
 */
export function getReleaseLineFromBranch(
  branch: string | undefined,
): ReleaseLine | undefined {
  return RELEASE_LINES.find((line) => {
    return line.sourceBranch === branch;
  });
}
