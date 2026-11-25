/** The branch a release is cut from, and the only one `ava release` runs on. */
export const RELEASE_SOURCE_BRANCH = "develop";

/** The branch a release publishes to. Pushing it deploys production. */
export const RELEASE_TARGET_BRANCH = "main";

/** Carried by `develop` between releases, e.g. `0.15.1-dev`. */
export const DEV_VERSION_SUFFIX = "-dev";

/** The workflow whose verdict on `develop` gates a release. */
export const SOURCE_CI_WORKFLOW = "staging.yaml";

/** The workflow that runs when the release target branch is pushed. */
export const TARGET_DEPLOY_WORKFLOW = "production.yaml";

/**
 * What pushing the release target branch does, warned about before the last
 * confirmation.
 */
export const DEPLOY_WARNING = `Pushing ${RELEASE_TARGET_BRANCH} deploys production and migrates the production database.`;
