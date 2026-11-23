import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

/** CLI for undoing this branch's local or remote Supabase switch. */
export const SupabaseRestoreCli = Acclimate.createCLI("restore")
  .description(
    "Undo this branch's `ava supabase switch`: put every development env file back as it was, and delete the branch's own local project and its data if it had one.",
  )
  .action(() => {
    const io = createSupabaseLocalEnvironmentIo(
      findRepoRoot() ?? process.cwd(),
    );
    CliTheme.progress("Restoring this branch's development env files...");
    return SupabaseLocalEnvironment.restore(io)
      .then(() => {
        CliTheme.success(
          "This branch is back on the develop local Supabase. Its env files are restored.",
        );
      })
      .catch((error: unknown) => {
        CliTheme.error({
          command: "ava supabase restore",
          message: error instanceof Error ? error.message : String(error),
          hint: "Run `ava supabase status` to see what this branch is on, then retry.",
        });
        process.exitCode = 1;
      });
  });

/** What `ava supabase restore --help` prints. */
export const SupabaseRestoreHelp: CommandHelpSpec = {
  commandPath: ["supabase", "restore"],
  cli: SupabaseRestoreCli,
  usage: ["ava supabase restore"],
  examples: [
    {
      label: "ava supabase restore",
      description: "Put the current branch back on the develop local Supabase.",
    },
  ],
};
