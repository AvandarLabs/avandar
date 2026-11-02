import { createReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import { describeCommandFailure } from "@ava-cli/ReleaseCli/describeCommandFailure/describeCommandFailure";
import { wantsHelp } from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { readVersionAtRevision } from "@ava-cli/ReleaseCli/releaseGitHelpers";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import type { IAcclimateCLI } from "@avandar/acclimate";

function _getProdVersion(): string {
  const repoRoot = findRepoRoot();
  if (repoRoot === undefined) {
    throw new Error("Run this command from inside the Avandar repository.");
  }

  const git = createReleaseCommands({ repoRoot, dryRun: false });
  const fetchResult = git.tryGit([
    "fetch",
    "--quiet",
    "--no-tags",
    "origin",
    "+refs/heads/main:refs/remotes/origin/main",
  ]);
  if (!fetchResult.ok) {
    throw new Error(
      `Could not fetch origin/main: ${describeCommandFailure(fetchResult, "git gave no reason")}`,
    );
  }

  const version = readVersionAtRevision(git, "refs/remotes/origin/main");
  if (version === undefined || version.trim().length === 0) {
    throw new Error(
      "Could not read the version from origin/main:package.json.",
    );
  }
  return version;
}

/** Print the production version recorded in origin/main's root package.json. */
export const GetProdVersionCli: IAcclimateCLI = Acclimate.createCLI(
  "get-prod-version",
)
  .description("Print the production version from main after fetching origin.")
  .action(() => {
    if (wantsHelp(process.argv.slice(2))) {
      console.log(
        `Usage: ava release get-prod-version

Fetch origin/main and print only its root package.json version.`,
      );
      return;
    }

    try {
      console.log(_getProdVersion());
    } catch (error: unknown) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });
