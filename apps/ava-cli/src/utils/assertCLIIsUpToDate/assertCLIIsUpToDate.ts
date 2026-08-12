import { checkCLIIsUpToDate } from "@ava-cli/utils/assertCLIIsUpToDate/checkCLIIsUpToDate";
import { getBuiltCLIVersion } from "@ava-cli/utils/assertCLIIsUpToDate/getBuiltCLIVersion";
import { printError, printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot/findRepoRoot";

/** The command that rebuilds `ava` and repoints the symlink on `$PATH`. */
const REBUILD_COMMAND = "pnpm build:ava-cli";

/**
 * The file currently executing.
 *
 * In the built CJS bundle this is the real path of `dist/main.cjs`, because
 * Node
 * resolves the symlink used to invoke it. It is undefined when the source runs
 * directly (tests), in which case the caller falls back to the expected bundle
 * location.
 */
function getRunningBundlePath(): string | undefined {
  return typeof __filename === "string" ? __filename : undefined;
}

/**
 * Stops the CLI when the running `ava` does not match `apps/ava-cli`.
 *
 * Called before any command runs, so a stale binary cannot act on the
 * repository. See `checkCLIIsUpToDate` for what "match" means and why.
 *
 * @returns true when it is safe to continue running commands.
 */
export function assertCLIIsUpToDate(): boolean {
  const result = checkCLIIsUpToDate({
    repoRoot: findRepoRoot(),
    builtVersion: getBuiltCLIVersion(),
    bundlePath: getRunningBundlePath(),
  });

  if (result.upToDate) {
    return true;
  }

  printError(`The ava CLI is out of date: ${result.reason}.`);
  printWarn(`No command was run. Rebuild it first:\n\n  ${REBUILD_COMMAND}\n`);
  return false;
}
