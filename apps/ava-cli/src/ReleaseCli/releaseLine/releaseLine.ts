/**
 * One of the two lines `ava release` can cut, read by the release CLI to
 * know which branches, version suffixes, and workflows a release uses.
 * Mainline is the reviewed line (`develop` to `main`). Alpha is the
 * temporary production line (`alpha-dev` to `alpha`).
 */
export type ReleaseLine = Readonly<{
  kind: "mainline" | "alpha";
  /** The branch a release is cut from and which `ava release` runs on. */
  sourceBranch: string;
  /** The branch a release publishes to. Pushing it deploys. */
  targetBranch: string;
  /** Appended to a released version, e.g. `0.15.0` becomes `0.15.0-alpha`. */
  releaseSuffix: string;
  /** Carried by the source branch between releases, e.g. `-dev`. */
  devSuffix: string;
  /** The workflow whose verdict on the source branch gates a release. */
  sourceCiWorkflow: string;
  /** The workflow pushing the target branch runs. */
  targetDeployWorkflow: string;
  /** The opening banner's title, e.g. `MAINLINE release`. */
  bannerTitle: string;
  /** The Acclimate color token for the banner title. */
  bannerColor: "bright_cyan" | "bright_yellow";
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
  bannerTitle: "MAINLINE release",
  bannerColor: "bright_cyan",
  deployWarning:
    "Pushing main deploys the mainline test URL. It does not touch production.",
};

/**
 * The release line `ava release` cuts on `alpha-dev`, publishing to `alpha`,
 * which serves app.avandarlabs.com.
 */
export const ALPHA_RELEASE_LINE: ReleaseLine = {
  kind: "alpha",
  sourceBranch: "alpha-dev",
  targetBranch: "alpha",
  releaseSuffix: "-alpha",
  devSuffix: "-alpha-dev",
  sourceCiWorkflow: "alpha-dev.yaml",
  targetDeployWorkflow: "alpha.yaml",
  bannerTitle: "ALPHA release",
  bannerColor: "bright_yellow",
  deployWarning:
    "Pushing alpha deploys PRODUCTION (app.avandarlabs.com) and migrates the production database.",
};

const RELEASE_LINES: readonly ReleaseLine[] = [
  MAINLINE_RELEASE_LINE,
  ALPHA_RELEASE_LINE,
];

/**
 * Gets the line released from `branch`, so `ava release` knows what to cut
 * from the current branch. Undefined when releases may not be cut from it:
 * only source branches qualify, and a target branch (`main`, `alpha`) is
 * never released from.
 */
export function getReleaseLineFromBranch(
  branch: string | undefined,
): ReleaseLine | undefined {
  return RELEASE_LINES.find((line) => {
    return line.sourceBranch === branch;
  });
}

/** The branches `ava release` may run on, listed in its error messages. */
export const RELEASE_SOURCE_BRANCHES: readonly string[] = RELEASE_LINES.map(
  (line) => {
    return line.sourceBranch;
  },
);
