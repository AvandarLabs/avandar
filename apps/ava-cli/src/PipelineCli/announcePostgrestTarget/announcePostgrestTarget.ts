import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { printInfo, printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import type { PostgrestTarget } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";

/**
 * Prints which database a command is about to change, and a warning when it
 * is production.
 */
export function announcePostgrestTarget(target: PostgrestTarget): void {
  const envTarget = AvaEnv.getLoadedEnvTarget();
  printInfo(`Database: ${envTarget} (${target.apiUrl})`);
  if (envTarget === "production") {
    printWarn(
      "WARNING: this will delete rows from the PRODUCTION database. " +
        "Workspaces in production may be using these listings.",
    );
  }
}
